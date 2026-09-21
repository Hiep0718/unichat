package com.unichat.core.workchat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ConversationSummary;
import com.unichat.core.workchat.api.MessageResponse;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;

/**
 * One-to-one messaging between people who share a group.
 *
 * <p>Sharing a group is what grants the right to message someone: on a campus
 * platform, anyone being reachable by any stranger is a way to be harassed, not
 * a feature. {@link ContactDirectory} decides that; this service enforces it on
 * every conversation it opens.
 *
 * <p>Every read and write checks participation. A conversation id is a UUID a
 * caller could guess at, so membership of the conversation is verified rather
 * than assumed from having the id.
 */
@Service
@Transactional(readOnly = true)
public class DirectMessageService {

    private static final int PREVIEW_LENGTH = 120;

    private final DirectConversationRepository conversationRepository;
    private final DirectMessageRepository messageRepository;
    private final ContactDirectory contactDirectory;
    private final UserRepository userRepository;
    private final Clock clock;

    public DirectMessageService(DirectConversationRepository conversationRepository,
                                DirectMessageRepository messageRepository,
                                ContactDirectory contactDirectory,
                                UserRepository userRepository,
                                Clock clock) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.contactDirectory = contactDirectory;
        this.userRepository = userRepository;
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
                .orElseGet(() -> conversationRepository.save(DirectConversation.between(
                        UuidGenerator.generateV7(), callerId, otherUserId, Instant.now(clock))));

        return toSummary(conversation, callerId, null, 0L);
    }

    /** The caller's conversations, most recently active first. */
    public List<ConversationSummary> listConversations(UUID callerId, int page, int size) {
        Page<DirectConversation> conversations =
                conversationRepository.findForParticipant(callerId, PageRequest.of(page, size));

        List<UUID> ids = conversations.getContent().stream().map(DirectConversation::getId).toList();
        Map<UUID, DirectMessage> latest = latestByConversation(ids);
        Map<UUID, Long> unread = unreadByConversation(ids, callerId);

        return conversations.getContent().stream()
                .map(conversation -> toSummary(
                        conversation,
                        callerId,
                        latest.get(conversation.getId()),
                        unread.getOrDefault(conversation.getId(), 0L)))
                .toList();
    }

    /**
     * Messages in a conversation, newest first.
     *
     * @throws AuthorizationError if the caller is not one of the two participants
     */
    public List<MessageResponse> listMessages(UUID callerId, UUID conversationId, int page, int size) {
        requireParticipant(callerId, conversationId);

        List<DirectMessage> messages = messageRepository
                .findByConversationIdOrderByCreatedAtDesc(conversationId, PageRequest.of(page, size))
                .getContent();

        Map<UUID, String> names = namesOf(
                messages.stream().map(DirectMessage::getSenderId).distinct().toList());

        return messages.stream()
                .map(message -> MessageResponse.from(
                        message, names.getOrDefault(message.getSenderId(), "Người dùng"), callerId))
                .toList();
    }

    /**
     * Sends a message, and moves the conversation to the top of both lists.
     *
     * @throws AuthorizationError if the caller is not one of the two participants
     */
    @Transactional
    public MessageResponse send(UUID callerId, UUID conversationId, String body) {
        DirectConversation conversation = requireParticipant(callerId, conversationId);

        Instant now = Instant.now(clock);
        DirectMessage message = new DirectMessage(
                UuidGenerator.generateV7(), conversationId, callerId, body.trim(), now);
        messageRepository.save(message);

        conversation.setLastMessageAt(now);
        conversationRepository.save(conversation);

        return MessageResponse.from(message, displayNameOf(callerId), callerId);
    }

    /**
     * Marks the other person's messages as read. Idempotent: an already-read
     * message keeps its original timestamp.
     *
     * @return how many messages this call marked
     */
    @Transactional
    public int markRead(UUID callerId, UUID conversationId) {
        requireParticipant(callerId, conversationId);

        List<DirectMessage> unread = messageRepository.findUnreadFor(conversationId, callerId);
        Instant now = Instant.now(clock);
        unread.forEach(message -> message.markRead(now));
        messageRepository.saveAll(unread);
        return unread.size();
    }

    /**
     * Loads the conversation and confirms the caller belongs to it.
     *
     * <p>Not found and not-a-participant are deliberately the same answer: a
     * different message would tell a stranger that a conversation exists.
     */
    private DirectConversation requireParticipant(UUID callerId, UUID conversationId) {
        DirectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new NotFoundError("Cuộc trò chuyện không tồn tại"));
        if (!conversation.includes(callerId)) {
            throw new NotFoundError("Cuộc trò chuyện không tồn tại");
        }
        return conversation;
    }

    private ConversationSummary toSummary(DirectConversation conversation, UUID callerId,
                                          DirectMessage latest, long unreadCount) {
        UUID otherUserId = conversation.otherThan(callerId);
        return new ConversationSummary(
                conversation.getId(),
                otherUserId,
                displayNameOf(otherUserId),
                latest == null ? null : preview(latest.getBody()),
                conversation.getLastMessageAt(),
                unreadCount);
    }

    private Map<UUID, DirectMessage> latestByConversation(List<UUID> conversationIds) {
        if (conversationIds.isEmpty()) {
            return Map.of();
        }
        return messageRepository.findLatestPerConversation(conversationIds).stream()
                .collect(Collectors.toMap(
                        DirectMessage::getConversationId,
                        message -> message,
                        // Two messages can share the newest timestamp; either
                        // serves as the preview.
                        (first, second) -> first));
    }

    private Map<UUID, Long> unreadByConversation(List<UUID> conversationIds, UUID callerId) {
        if (conversationIds.isEmpty()) {
            return Map.of();
        }
        return messageRepository.countUnreadByConversation(conversationIds, callerId).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]));
    }

    private Map<UUID, String> namesOf(List<UUID> userIds) {
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, DirectMessageService::displayName));
    }

    private String displayNameOf(UUID userId) {
        return userRepository.findById(userId)
                .map(DirectMessageService::displayName)
                .orElse("Người dùng");
    }

    private static String displayName(User user) {
        return user.getEmail().split("@")[0];
    }

    /** Enough of the message to recognise the thread, not to read it. */
    private static String preview(String body) {
        String flattened = body.replaceAll("\\s+", " ").trim();
        return flattened.length() <= PREVIEW_LENGTH
                ? flattened
                : flattened.substring(0, PREVIEW_LENGTH) + "…";
    }
}
