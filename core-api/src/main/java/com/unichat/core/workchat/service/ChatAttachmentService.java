package com.unichat.core.workchat.service;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.FileRejectedError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.workchat.api.ChatAttachmentResponse;
import com.unichat.core.workchat.domain.ChatAttachment;
import com.unichat.core.workchat.domain.ChatAttachmentKind;
import com.unichat.core.workchat.domain.ChatAttachmentRepository;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;

/**
 * Files sent inside a conversation.
 *
 * <p>Private to the people in it. Unlike a post attachment, a chat file is
 * never registered in the workspace document library and the AI assistant never
 * reads it: a file sent in a private exchange becoming a group-wide retrieval
 * source would publish it to people who were never shown it.
 *
 * <p>Bytes are served through {@link #read} rather than by handing out a
 * storage key, so participation is checked on every single read.
 */
@Service
@Transactional(readOnly = true)
public class ChatAttachmentService {

    /** Per message, not per file: the servlet caps a whole request at 25 MB. */
    static final long MAX_TOTAL_BYTES = 20L * 1024 * 1024;
    static final int MAX_FILES_PER_MESSAGE = 5;

    private static final List<String> IMAGE_TYPES =
            List.of("image/png", "image/jpeg", "image/webp", "image/gif");

    /** No SVG and no HTML: both can run script when served inline. */
    private static final List<String> FILE_TYPES = List.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain");

    private final ChatAttachmentRepository attachmentRepository;
    private final DirectMessageRepository messageRepository;
    private final ConversationAccess conversationAccess;
    private final StoragePort storagePort;
    private final Clock clock;

    public ChatAttachmentService(ChatAttachmentRepository attachmentRepository,
                                 DirectMessageRepository messageRepository,
                                 ConversationAccess conversationAccess,
                                 StoragePort storagePort,
                                 Clock clock) {
        this.attachmentRepository = attachmentRepository;
        this.messageRepository = messageRepository;
        this.conversationAccess = conversationAccess;
        this.storagePort = storagePort;
        this.clock = clock;
    }

    /**
     * Validates every file before any of them is stored.
     *
     * <p>Called before the message row is written, so a rejected batch leaves
     * nothing behind: neither a message nor a half-uploaded set of blobs.
     *
     * @throws FileRejectedError on too many files, an empty file, an
     *                           unsupported format, or too many bytes in total
     */
    public void validateAll(List<MultipartFile> files) {
        if (files.size() > MAX_FILES_PER_MESSAGE) {
            throw new FileRejectedError(
                    "Mỗi tin nhắn chỉ gửi được tối đa " + MAX_FILES_PER_MESSAGE + " tệp");
        }
        long total = 0;
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                throw new FileRejectedError("Tệp rỗng không gửi được");
            }
            resolveKind(file.getContentType());
            total += file.getSize();
        }
        if (total > MAX_TOTAL_BYTES) {
            throw new FileRejectedError("Tổng dung lượng tệp trong một tin nhắn vượt quá 20 MiB");
        }
    }

    /**
     * Stores the files of a message that has just been written.
     *
     * <p>Runs inside the caller's transaction so that a failure here takes the
     * message with it. A bubble whose file is missing cannot be taken back,
     * because live delivery has already pushed it.
     *
     * @return the stored files, oldest first
     */
    @Transactional
    public List<ChatAttachmentResponse> attachAll(UUID conversationId, UUID messageId,
                                                  List<MultipartFile> files) {
        validateAll(files);
        Instant now = Instant.now(clock);

        return files.stream()
                .map(file -> attachmentRepository.save(new ChatAttachment(
                        UuidGenerator.generateV7(),
                        messageId,
                        resolveKind(file.getContentType()),
                        storeBlob(conversationId, messageId, file),
                        sanitize(file.getOriginalFilename()),
                        file.getContentType(),
                        file.getSize(),
                        now)))
                .map(ChatAttachmentResponse::from)
                .toList();
    }

    /** One message's files, oldest first. */
    public List<ChatAttachmentResponse> listFor(UUID messageId) {
        return attachmentRepository.findByMessageIdOrderByCreatedAtAsc(messageId).stream()
                .map(ChatAttachmentResponse::from)
                .toList();
    }

    /** Files for a page of messages, grouped by message id in one query. */
    public Map<UUID, List<ChatAttachmentResponse>> listForAll(List<UUID> messageIds) {
        if (messageIds.isEmpty()) {
            return Map.of();
        }
        return attachmentRepository.findByMessageIdInOrderByCreatedAtAsc(messageIds).stream()
                .collect(Collectors.groupingBy(
                        ChatAttachment::getMessageId,
                        Collectors.mapping(ChatAttachmentResponse::from, Collectors.toList())));
    }

    /**
     * Reads a file for a participant of the conversation it was sent in.
     *
     * <p>All three links are checked: the caller is in the conversation, the
     * message is in that conversation, and the attachment is on that message.
     * Checking only the first would let any attachment id be served through a
     * conversation the caller happens to belong to.
     */
    public AttachmentContent read(UUID callerId, UUID conversationId, UUID messageId,
                                  UUID attachmentId) {
        conversationAccess.requireParticipant(callerId, conversationId);
        requireMessageIn(conversationId, messageId);

        ChatAttachment attachment = attachmentRepository
                .findByIdAndMessageId(attachmentId, messageId)
                .orElseThrow(() -> new NotFoundError("Tệp đính kèm không tồn tại"));

        return new AttachmentContent(
                storagePort.retrieve(attachment.getStorageKey()),
                attachment.getMediaType(),
                attachment.getOriginalName(),
                attachment.getKind() == ChatAttachmentKind.IMAGE);
    }

    /**
     * Bytes plus what is needed to serve them.
     *
     * @param renderInline true only for the image formats on the allowlist.
     *                     Everything else is served as a download, so that a
     *                     mislabelled file cannot run in the API's own origin.
     */
    public record AttachmentContent(byte[] bytes, String mediaType, String fileName,
                                    boolean renderInline) {}

    /* ---------- Private helpers ---------- */

    private void requireMessageIn(UUID conversationId, UUID messageId) {
        DirectMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new NotFoundError("Tin nhắn không tồn tại"));
        if (!message.getConversationId().equals(conversationId)) {
            throw new NotFoundError("Tin nhắn không tồn tại");
        }
    }

    private String storeBlob(UUID conversationId, UUID messageId, MultipartFile file) {
        String storageKey = "chat/" + conversationId + "/" + messageId + "/"
                + UuidGenerator.generateV7() + "_" + sanitize(file.getOriginalFilename());
        try (var stream = file.getInputStream()) {
            return storagePort.store(storageKey, stream, file.getSize());
        } catch (IOException e) {
            throw new FileRejectedError("Không đọc được tệp đính kèm");
        }
    }

    private static ChatAttachmentKind resolveKind(String mediaType) {
        if (mediaType == null) {
            throw new FileRejectedError("Không xác định được định dạng tệp");
        }
        if (IMAGE_TYPES.contains(mediaType)) {
            return ChatAttachmentKind.IMAGE;
        }
        if (FILE_TYPES.contains(mediaType)) {
            return ChatAttachmentKind.FILE;
        }
        throw new FileRejectedError(
                "Chỉ hỗ trợ ảnh (PNG, JPEG, WebP, GIF) và tệp PDF, DOCX, TXT");
    }

    private static String sanitize(String filename) {
        String name = filename == null ? "tep-dinh-kem" : filename;
        return name.replaceAll("[\\\\/\\r\\n]", "_");
    }
}
