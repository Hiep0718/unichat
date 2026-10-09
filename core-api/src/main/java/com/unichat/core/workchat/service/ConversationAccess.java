package com.unichat.core.workchat.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;

/**
 * Decides whether someone may see a conversation at all.
 *
 * <p>Kept apart from the services that use it so the rule has one home, the
 * same way {@link ContactDirectory} is the one home for who may message whom.
 * Messages, read receipts and attachments all go through here rather than each
 * re-deriving participation from the conversation row.
 */
@Service
@Transactional(readOnly = true)
public class ConversationAccess {

    private final DirectConversationRepository conversationRepository;

    public ConversationAccess(DirectConversationRepository conversationRepository) {
        this.conversationRepository = conversationRepository;
    }

    /**
     * Loads the conversation and confirms the caller belongs to it.
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
        DirectConversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(ConversationAccess::hidden);
        if (!conversation.includes(callerId)) {
            throw hidden();
        }
        return conversation;
    }

    private static NotFoundError hidden() {
        return new NotFoundError("Cuộc trò chuyện không tồn tại");
    }
}
