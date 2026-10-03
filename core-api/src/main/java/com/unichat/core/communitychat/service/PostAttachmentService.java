package com.unichat.core.communitychat.service;

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

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.communitychat.api.PostAttachmentResponse;
import com.unichat.core.communitychat.domain.AttachmentKind;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.PostAttachmentRepository;
import com.unichat.core.document.service.DocumentService;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Files attached to posts.
 *
 * <p>Images are stored for display only. A document attachment is additionally
 * handed to {@link DocumentService}, which applies the usual contribution rules:
 * an owner or editor publishes it straight into the group's library, while a
 * member's file waits for approval. Either way the AI assistant only ever reads
 * what reached the library.
 */
@Service
@Transactional(readOnly = true)
public class PostAttachmentService {

    private static final long MAX_ATTACHMENT_SIZE = 20L * 1024 * 1024;
    private static final int MAX_ATTACHMENTS_PER_POST = 10;

    private static final List<String> IMAGE_TYPES =
            List.of("image/png", "image/jpeg", "image/webp", "image/gif");
    private static final List<String> DOCUMENT_TYPES = List.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain");

    private final PostAttachmentRepository attachmentRepository;
    private final DiscussionRepository discussionRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final DocumentService documentService;
    private final StoragePort storagePort;
    private final Clock clock;

    public PostAttachmentService(PostAttachmentRepository attachmentRepository,
                                 DiscussionRepository discussionRepository,
                                 WorkspaceMemberRepository memberRepository,
                                 DocumentService documentService,
                                 StoragePort storagePort,
                                 Clock clock) {
        this.attachmentRepository = attachmentRepository;
        this.discussionRepository = discussionRepository;
        this.memberRepository = memberRepository;
        this.documentService = documentService;
        this.storagePort = storagePort;
        this.clock = clock;
    }

    /**
     * Attaches a file to a post. Only the post author may add attachments.
     *
     * @param requestId correlation id passed through to document ingestion
     */
    @Transactional
    public PostAttachmentResponse attach(UUID workspaceId, UUID discussionId, UUID userId,
                                         MultipartFile file, String requestId) {
        Discussion discussion = requireAuthoredPost(workspaceId, discussionId, userId);
        validate(file);

        if (attachmentRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId).size()
                >= MAX_ATTACHMENTS_PER_POST) {
            throw new ValidationError(
                    "Mỗi bài viết chỉ đính kèm tối đa " + MAX_ATTACHMENTS_PER_POST + " tệp");
        }

        AttachmentKind kind = resolveKind(file.getContentType());
        UUID documentId = kind == AttachmentKind.DOCUMENT
                ? registerAsDocument(workspaceId, userId, file, discussion, requestId)
                : null;

        PostAttachment attachment = new PostAttachment(
                UuidGenerator.generateV7(),
                discussionId,
                kind,
                storeBlob(workspaceId, discussionId, file),
                sanitize(file.getOriginalFilename()),
                file.getContentType(),
                file.getSize(),
                documentId,
                userId,
                Instant.now(clock));

        attachmentRepository.save(attachment);

        // A photo grid on top of a gradient is noise, so the file wins and the
        // background goes. Done here rather than in the compose screen because
        // attachments are uploaded after the post exists, so this is the first
        // moment the two are known to coexist.
        if (discussion.getBackgroundKey() != null) {
            discussion.setBackgroundKey(null);
            discussionRepository.save(discussion);
        }

        return PostAttachmentResponse.from(attachment);
    }

    /** Removes an attachment from a post. The library entry, if any, stays. */
    @Transactional
    public void remove(UUID workspaceId, UUID discussionId, UUID attachmentId, UUID userId) {
        requireAuthoredPost(workspaceId, discussionId, userId);

        PostAttachment attachment = attachmentRepository
                .findByIdAndDiscussionId(attachmentId, discussionId)
                .orElseThrow(() -> new NotFoundError("Tệp đính kèm không tồn tại"));

        attachmentRepository.delete(attachment);
    }

    /** Returns attachment bytes for a member of the owning workspace. */
    public AttachmentContent read(UUID workspaceId, UUID discussionId, UUID attachmentId, UUID userId) {
        requireMembership(workspaceId, userId);
        requirePostInWorkspace(workspaceId, discussionId);

        PostAttachment attachment = attachmentRepository
                .findByIdAndDiscussionId(attachmentId, discussionId)
                .orElseThrow(() -> new NotFoundError("Tệp đính kèm không tồn tại"));

        return new AttachmentContent(
                storagePort.retrieve(attachment.getStorageKey()),
                attachment.getMediaType(),
                attachment.getOriginalName());
    }

    /** Attachments of one post, oldest first. */
    public List<PostAttachmentResponse> listFor(UUID discussionId) {
        return attachmentRepository.findByDiscussionIdOrderByCreatedAtAsc(discussionId).stream()
                .map(PostAttachmentResponse::from)
                .toList();
    }

    /** Attachments for a page of posts, grouped by post id in one query. */
    public Map<UUID, List<PostAttachmentResponse>> listForAll(List<UUID> discussionIds) {
        if (discussionIds.isEmpty()) {
            return Map.of();
        }
        return attachmentRepository.findByDiscussionIdInOrderByCreatedAtAsc(discussionIds).stream()
                .collect(Collectors.groupingBy(
                        PostAttachment::getDiscussionId,
                        Collectors.mapping(PostAttachmentResponse::from, Collectors.toList())));
    }

    /** Bytes plus the metadata needed to serve them. */
    public record AttachmentContent(byte[] bytes, String mediaType, String fileName) {}

    /* ---------- Private helpers ---------- */

    /**
     * Hands a document attachment to the library so the assistant can cite it.
     * The post supplies the contribution context a member would otherwise type.
     */
    private UUID registerAsDocument(UUID workspaceId, UUID userId, MultipartFile file,
                                    Discussion discussion, String requestId) {
        return documentService.uploadDocument(
                userId,
                workspaceId,
                file,
                requestId,
                sanitize(file.getOriginalFilename()),
                "Đính kèm bài viết: " + discussion.getTitle()).documentId();
    }

    private String storeBlob(UUID workspaceId, UUID discussionId, MultipartFile file) {
        String storageKey = "posts/" + workspaceId + "/" + discussionId + "/"
                + UuidGenerator.generateV7() + "_" + sanitize(file.getOriginalFilename());
        try (var stream = file.getInputStream()) {
            return storagePort.store(storageKey, stream, file.getSize());
        } catch (IOException e) {
            throw new ValidationError("Không đọc được tệp đính kèm");
        }
    }

    private Discussion requireAuthoredPost(UUID workspaceId, UUID discussionId, UUID userId) {
        requireMembership(workspaceId, userId);
        Discussion discussion = requirePostInWorkspace(workspaceId, discussionId);
        if (!discussion.getAuthorId().equals(userId)) {
            throw new AuthorizationError("Chỉ tác giả mới có thể thay đổi tệp đính kèm");
        }
        return discussion;
    }

    private Discussion requirePostInWorkspace(UUID workspaceId, UUID discussionId) {
        Discussion discussion = discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Bài viết không tồn tại"));
        if (!discussion.getWorkspaceId().equals(workspaceId)) {
            throw new AuthorizationError("Bài viết không thuộc Workspace này");
        }
        return discussion;
    }

    private void requireMembership(UUID workspaceId, UUID userId) {
        memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new AuthorizationError("Bạn không phải thành viên của nhóm này"));
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationError("Tệp đính kèm không được để trống");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE) {
            throw new ValidationError("Tệp đính kèm vượt quá 20 MiB");
        }
        resolveKind(file.getContentType());
    }

    private AttachmentKind resolveKind(String mediaType) {
        if (mediaType == null) {
            throw new ValidationError("Không xác định được định dạng tệp");
        }
        if (IMAGE_TYPES.contains(mediaType)) {
            return AttachmentKind.IMAGE;
        }
        if (DOCUMENT_TYPES.contains(mediaType)) {
            return AttachmentKind.DOCUMENT;
        }
        throw new ValidationError("Chỉ hỗ trợ ảnh (PNG, JPEG, WebP, GIF) và tài liệu PDF, DOCX, TXT");
    }

    private static String sanitize(String filename) {
        String name = filename == null ? "tep-dinh-kem" : filename;
        return name.replaceAll("[\\\\/\\r\\n]", "_");
    }
}
