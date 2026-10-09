package com.unichat.core.workchat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ChatAttachmentResponse;
import com.unichat.core.workchat.api.ConversationSummary;
import com.unichat.core.workchat.api.MessageResponse;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;
import com.unichat.core.workchat.domain.DirectMessageSentEvent;
import com.unichat.core.workchat.domain.ParticipantRole;

/**
 * Sending and reading messages, in a one-to-one conversation or a group.
 *
 * <p>Sharing a group is what grants the right to message someone: in any
 * organisation, anyone being reachable by any stranger is a way to be harassed,
 * not a feature. {@link ContactDirectory} decides that; this service enforces
 * it on every conversation it opens, and {@link GroupConversationService} on
 * every member a group gains.
 *
 * <p>Every read and write checks participation through {@link ConversationAccess}.
 * A conversation id is a UUID a caller could guess at, so membership is verified
 * rather than assumed from having the id.
 */
@Service
@Transactional(readOnly = true)
public class DirectMessageService {

    /** Enforced here rather than only on the JSON request, which the
     *  multipart path does not go through. */
    private static final int MAX_BODY_LENGTH = 4000;
    private static final String UNKNOWN_NAME = "Người dùng";

    private final DirectConversationRepository conversationRepository;
    private final DirectMessageRepository messageRepository;
    private final ConversationParticipantRepository participantRepository;
    private final ContactDirectory contactDirectory;
    private final ConversationAccess conversationAccess;
    private final ConversationSummaryAssembler assembler;
    private final ChatAttachmentService attachmentService;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    public DirectMessageService(DirectConversationRepository conversationRepository,
                                DirectMessageRepository messageRepository,
                                ConversationParticipantRepository participantRepository,
                                ContactDirectory contactDirectory,
                                ConversationAccess conversationAccess,
                                ConversationSummaryAssembler assembler,
                                ChatAttachmentService attachmentService,
                                UserRepository userRepository,
                                ApplicationEventPublisher eventPublisher,
                                Clock clock) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.participantRepository = participantRepository;
        this.contactDirectory = contactDirectory;
        this.conversationAccess = conversationAccess;
        this.assembler = assembler;
        this.attachmentService = attachmentService;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    /**
     * Opens the conversation with someone, creating it if this is the first time.
     *
     * <p>Returns the same conversation whichever of the two asks, because the
     * participants are stored in a fixed order.
     *
     * @throws AuthorizationError if the two share no group
     */
    @Transactional
    public ConversationSummary openWith(UUID callerId, UUID otherUserId) {
        if (callerId.equals(otherUserId)) {
            throw new AuthorizationError("Không thể nhắn tin cho chính mình");
        }
        if (!contactDirectory.canMessage(callerId, otherUserId)) {
            throw new AuthorizationError("Bạn chỉ nhắn tin được với thành viên cùng nhóm");
        }

        DirectConversation conversation = conversationRepository
                .findByParticipantLowAndParticipantHigh(
                        DirectConversation.lowerOf(callerId, otherUserId),
                        DirectConversation.higherOf(callerId, otherUserId))
                .orElseGet(() -> openPair(callerId, otherUserId));

        return assembler.assembleOne(conversation, callerId);
    }

    /** The caller's conversations, most recently active first. */
    public List<ConversationSummary> listConversations(UUID callerId, int page, int size) {
        Page<DirectConversation> conversations =
                conversationRepository.findForParticipant(callerId, PageRequest.of(page, size));
        return assembler.assemble(conversations.getContent(), callerId);
    }

    /**
     * Messages in a conversation, newest first.
     *
     * @throws AuthorizationError if the caller does not take part in it
     */
    public List<MessageResponse> listMessages(UUID callerId, UUID conversationId, int page, int size) {
        conversationAccess.requireParticipant(callerId, conversationId);

        List<DirectMessage> messages = messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, PageRequest.of(page, size))
                .getContent();

        Map<UUID, String> names = namesOf(
                messages.stream().map(DirectMessage::getSenderId).distinct().toList());
        Map<UUID, List<ChatAttachmentResponse>> attachments = attachmentService.listForAll(
                messages.stream().map(DirectMessage::getId).toList());

        return messages.stream()
                .map(message -> MessageResponse.from(
                        message,
                        names.getOrDefault(message.getSenderId(), UNKNOWN_NAME),
                        callerId,
                        attachments.getOrDefault(message.getId(), List.of())))
                .toList();
    }

    /** Sends a message that is text only. */
    @Transactional
    public MessageResponse send(UUID callerId, UUID conversationId, String body) {
        return send(callerId, conversationId, body, List.of());
    }

    /**
     * Sends a message, and moves the conversation to the top of every list.
     *
     * <p>Text and files arrive as one message rather than as a message
     * followed by an upload: delivery pushes the message as soon as it is
     * committed, and a reader must never see a bubble whose file is still on
     * its way.
     *
     * @throws ValidationError    if there is neither text nor a file
     * @throws AuthorizationError if the caller does not take part in it
     */
    @Transactional
    public MessageResponse send(UUID callerId, UUID conversationId, String body,
                                List<MultipartFile> files) {
        DirectConversation conversation =
                conversationAccess.requireParticipant(callerId, conversationId);

        String text = textOrNull(body);
        if (text != null && text.length() > MAX_BODY_LENGTH) {
            throw new ValidationError("Tin nhắn tối đa 4000 ký tự");
        }
        if (text == null && files.isEmpty()) {
            throw new ValidationError("Tin nhắn cần có nội dung hoặc tệp đính kèm");
        }
        // Checked before the message row exists, so a rejected file does not
        // leave an empty bubble behind.
        attachmentService.validateAll(files);

        Instant now = Instant.now(clock);
        DirectMessage message = new DirectMessage(
                UuidGenerator.generateV7(), conversationId, callerId, text, now);
        messageRepository.save(message);

        List<ChatAttachmentResponse> attachments = files.isEmpty()
                ? List.of()
                : attachmentService.attachAll(conversationId, message.getId(), files);

        conversation.setLastMessageAt(now);
        conversationRepository.save(conversation);

        MessageResponse response =
                MessageResponse.from(message, displayNameOf(callerId), callerId, attachments);
        // Delivery is someone else's job; this service stays free of the broker
        // so it keeps working, and keeps being testable, without one.
        eventPublisher.publishEvent(new DirectMessageSentEvent(
                conversationAccess.recipientsOf(conversationId, callerId), response));
        return response;
    }

    /**
     * Marks everything in this conversation as read, up to now.
     *
     * <p>A watermark rather than a flag per message: with several people in a
     * conversation, read is a fact about each of them. Idempotent, and never
     * moves backwards, so reopening older history does not unread what follows.
     */
    @Transactional
    public void markRead(UUID callerId, UUID conversationId) {
        ConversationParticipant participant =
                conversationAccess.participationOf(callerId, conversationId).participant();
        participant.readUpTo(Instant.now(clock));
        participantRepository.save(participant);
    }

    /* ---------- Private helpers ---------- */

    /**
     * Creates a one-to-one conversation and both participant rows.
     *
     * <p>The rows exist for a pair as well as for a group, so that listing,
     * participation and read state have one implementation rather than two.
     */
    private DirectConversation openPair(UUID callerId, UUID otherUserId) {
        Instant now = Instant.now(clock);
        DirectConversation conversation = conversationRepository.save(DirectConversation.between(
                UuidGenerator.generateV7(), callerId, otherUserId, now));

        participantRepository.save(new ConversationParticipant(
                conversation.getId(), callerId, ParticipantRole.MEMBER, now));
        participantRepository.save(new ConversationParticipant(
                conversation.getId(), otherUserId, ParticipantRole.MEMBER, now));
        return conversation;
    }

    private Map<UUID, String> namesOf(List<UUID> userIds) {
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));
    }

    private String displayNameOf(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getDisplayName)
                .orElse(UNKNOWN_NAME);
    }

    /** Trimmed text, or null when the message carries only files. */
    private static String textOrNull(String body) {
        return body == null || body.isBlank() ? null : body.trim();
    }
}
