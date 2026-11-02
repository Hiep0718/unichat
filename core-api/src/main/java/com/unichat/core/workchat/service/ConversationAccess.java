package com.unichat.core.workchat.service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.workchat.domain.ConversationParticipant;
import com.unichat.core.workchat.domain.ConversationParticipantRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;

/**
 * Decides whether someone may see a conversation at all.
 *
 * <p>Kept apart from the services that use it so the rule has one home, the
 * same way {@link ContactDirectory} is the one home for who may message whom.
 * Messages, read state, attachments and group administration all go through
 * here rather than each re-deriving participation.
 *
 * <p>Participation is read from the participant rows for both kinds of
 * conversation, including one-to-one ones. Asking the conversation row instead
 * would mean two different answers to the same question.
 */
@Service
@Transactional(readOnly = true)
public class ConversationAccess {

    private final DirectConversationRepository conversationRepository;
    private final ConversationParticipantRepository participantRepository;

    public ConversationAccess(DirectConversationRepository conversationRepository,
                              ConversationParticipantRepository participantRepository) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
    }

    /**
     * Loads the conversation and confirms the caller takes part in it.
     *
     * <p>A conversation id is a UUID a caller could guess at, so participation
     * is verified rather than assumed from having the id.
     *
     * @throws NotFoundError if it does not exist, and equally if the caller is
     *                       not a participant — a different answer for the
     *                       second case would tell a stranger that a
     *                       conversation exists
     */
    public DirectConversation requireParticipant(UUID callerId, UUID conversationId) {
        return participationOf(callerId, conversationId).conversation();
    }

    /**
     * The conversation together with the caller's own membership of it.
     *
     * <p>Returned as a pair because the callers that need the membership — read
     * watermarks, group administration — also need the conversation, and
     * loading them separately would check participation twice.
     */
    public Participation participationOf(UUID callerId, UUID conversationId) {
        DirectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(ConversationAccess::hidden);
        ConversationParticipant participant = participantRepository
                .findByIdConversationIdAndIdUserId(conversationId, callerId)
                .orElseThrow(ConversationAccess::hidden);
        return new Participation(conversation, participant);
    }

    /**
     * Loads a group and confirms the caller owns it.
     *
     * <p>Lives here rather than in one of the services because two of them now
     * administer a group — its membership and its picture — and an owner check
     * written twice is an owner check that can disagree with itself.
     *
     * @throws ValidationError    if the conversation is one-to-one, which has
     *                            nothing to administer
     * @throws AuthorizationError if the caller takes part but does not own it
     */
    public DirectConversation requireGroupOwner(UUID callerId, UUID conversationId) {
        Participation participation = participationOf(callerId, conversationId);
        if (!participation.conversation().isGroup()) {
            throw new ValidationError("Cuộc trò chuyện này không phải nhóm");
        }
        if (!participation.participant().isOwner()) {
            throw new AuthorizationError("Chỉ chủ nhóm mới thay đổi được nhóm");
        }
        return participation.conversation();
    }

    /** Everyone taking part, in the order they joined. */
    public List<ConversationParticipant> participantsOf(UUID conversationId) {
        return participantRepository.findByIdConversationIdOrderByJoinedAtAsc(conversationId);
    }

    /**
     * Who a message should be delivered to: everyone taking part but its sender.
     *
     * <p>The sender's own client already has the message from the request it
     * made, and pushing it back would duplicate the bubble.
     */
    public Set<UUID> recipientsOf(UUID conversationId, UUID senderId) {
        return participantsOf(conversationId).stream()
                .map(ConversationParticipant::getUserId)
                .filter(userId -> !userId.equals(senderId))
                .collect(Collectors.toSet());
    }

    /** A conversation and one person's membership of it. */
    public record Participation(DirectConversation conversation,
                                ConversationParticipant participant) {}

    private static NotFoundError hidden() {
        return new NotFoundError("Cuộc trò chuyện không tồn tại");
    }
}
