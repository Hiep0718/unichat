package com.unichat.core.workchat.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.api.ConversationSummary;
import com.unichat.core.workchat.api.ParticipantSummary;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectMessage;
import com.unichat.core.workchat.domain.DirectMessageRepository;

/**
 * Turns conversations into the rows the list shows.
 *
 * <p>A row needs four things that live in four places — the newest message, the
 * caller's unread count, who is taking part, and their names — so this gathers
 * each for the whole page in one query rather than per row.
 *
 * <p>Separate from {@link DirectMessageService} because assembling a row is not
 * the same job as sending and reading messages, and keeping both in one class
 * is what pushed that class towards its size limit.
 */
@Service
@Transactional(readOnly = true)
public class ConversationSummaryAssembler {

    private static final int PREVIEW_LENGTH = 120;
    private static final String UNKNOWN_NAME = "Người dùng";

    private final ConversationParticipantRepository participantRepository;
    private final DirectMessageRepository messageRepository;
    private final UserRepository userRepository;

    public ConversationSummaryAssembler(ConversationParticipantRepository participantRepository,
                                        DirectMessageRepository messageRepository,
                                        UserRepository userRepository) {
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    /** A page of conversations, as the caller sees them. */
    public List<ConversationSummary> assemble(List<DirectConversation> conversations,
                                              UUID callerId) {
        if (conversations.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = conversations.stream().map(DirectConversation::getId).toList();
        Map<UUID, List<ConversationParticipant>> members = participantsByConversation(ids);
        Map<UUID, DirectMessage> latest = latestByConversation(ids);
        Map<UUID, Long> unread = unreadByConversation(ids, callerId);
        Map<UUID, String> names = namesOf(members);

        return conversations.stream()
                .map(conversation -> toSummary(
                        conversation,
                        callerId,
                        latest.get(conversation.getId()),
                        unread.getOrDefault(conversation.getId(), 0L),
                        members.getOrDefault(conversation.getId(), List.of()),
                        names))
                .toList();
    }

    /** One conversation, for the call that just opened or created it. */
    public ConversationSummary assembleOne(DirectConversation conversation, UUID callerId) {
        return assemble(List.of(conversation), callerId).get(0);
    }

    /** Everyone in a conversation, named, with the caller marked. */
    public List<ParticipantSummary> participantSummaries(
            List<ConversationParticipant> participants, UUID callerId) {
        Map<UUID, String> names = namesOfUsers(
                participants.stream().map(ConversationParticipant::getUserId).distinct().toList());
        return participants.stream()
                .map(participant -> toParticipant(participant, callerId, names))
                .toList();
    }

    /* ---------- Private helpers ---------- */

    private ConversationSummary toSummary(DirectConversation conversation, UUID callerId,
                                          DirectMessage latest, long unreadCount,
                                          List<ConversationParticipant> members,
                                          Map<UUID, String> names) {
        UUID otherUserId = conversation.isGroup() ? null : conversation.otherThan(callerId);
        return new ConversationSummary(
                conversation.getId(),
                conversation.getKind(),
                conversation.isGroup()
                        ? conversation.getTitle()
                        : names.getOrDefault(otherUserId, UNKNOWN_NAME),
                otherUserId,
                members.stream()
                        .map(member -> toParticipant(member, callerId, names))
                        .toList(),
                latest == null ? null : preview(latest.getBody()),
                conversation.getLastMessageAt(),
                unreadCount);
    }

    private static ParticipantSummary toParticipant(ConversationParticipant participant,
                                                    UUID callerId, Map<UUID, String> names) {
        return new ParticipantSummary(
                participant.getUserId(),
                names.getOrDefault(participant.getUserId(), UNKNOWN_NAME),
                participant.getRole(),
                participant.getUserId().equals(callerId));
    }

    private Map<UUID, List<ConversationParticipant>> participantsByConversation(List<UUID> ids) {
        return participantRepository.findByIdConversationIdIn(ids).stream()
                .collect(Collectors.groupingBy(ConversationParticipant::getConversationId));
    }

    private Map<UUID, DirectMessage> latestByConversation(List<UUID> conversationIds) {
        return messageRepository.findLatestPerConversation(conversationIds).stream()
                .collect(Collectors.toMap(
                        DirectMessage::getConversationId,
                        message -> message,
                        // Two messages can share the newest timestamp; either
                        // serves as the preview.
                        (first, second) -> first));
    }

    private Map<UUID, Long> unreadByConversation(List<UUID> conversationIds, UUID callerId) {
        return messageRepository.countUnreadByConversation(conversationIds, callerId).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).longValue()));
    }

    private Map<UUID, String> namesOf(Map<UUID, List<ConversationParticipant>> members) {
        return namesOfUsers(members.values().stream()
                .flatMap(List::stream)
                .map(ConversationParticipant::getUserId)
                .distinct()
                .toList());
    }

    private Map<UUID, String> namesOfUsers(List<UUID> userIds) {
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getDisplayName));
    }

    /** Enough of the message to recognise the thread, not to read it. */
    private static String preview(String body) {
        if (body == null) {
            return "Đã gửi tệp đính kèm";
        }
        String flattened = body.replaceAll("\\s+", " ").trim();
        return flattened.length() <= PREVIEW_LENGTH
                ? flattened
                : flattened.substring(0, PREVIEW_LENGTH) + "…";
    }
}
