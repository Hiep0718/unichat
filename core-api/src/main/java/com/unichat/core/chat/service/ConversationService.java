package com.unichat.core.chat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.chat.api.ConversationDetailResponse;
import com.unichat.core.chat.api.ConversationResponse;
import com.unichat.core.chat.api.MessageResponse;
import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.MessageRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.shared.util.UuidGenerator;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

/**
 * Service managing user conversation sessions and message history.
 */
@Service
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final Clock clock;

    public ConversationService(
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            Clock clock) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.clock = clock;
    }

    /**
     * Lists active conversations for the authenticated user in a workspace.
     */
    @Transactional(readOnly = true)
    public Page<ConversationResponse> getConversations(UUID userId, UUID workspaceId, Pageable pageable) {
        validateAccess(userId, workspaceId);
        return conversationRepository
                .findByUserIdAndWorkspaceIdAndStatusOrderByUpdatedAtDesc(userId, workspaceId, "ACTIVE", pageable)
                .map(ConversationResponse::from);
    }

    /**
     * Creates a new empty conversation session.
     */
    @Transactional
    public ConversationResponse createConversation(UUID userId, UUID workspaceId) {
        validateAccess(userId, workspaceId);
        Instant now = Instant.now(clock);
        Conversation conversation = new Conversation(
                UuidGenerator.generateV7(),
                workspaceId,
                userId,
                "Hội thoại mới",
                now
        );
        conversationRepository.save(conversation);
        return ConversationResponse.from(conversation);
    }

    /**
     * Retrieves conversation details along with message history.
     */
    @Transactional(readOnly = true)
    public ConversationDetailResponse getConversation(UUID userId, UUID workspaceId, UUID conversationId) {
        validateAccess(userId, workspaceId);
        Conversation conversation = conversationRepository
                .findByUserIdAndIdAndStatus(userId, conversationId, "ACTIVE")
                .orElseThrow(() -> new NotFoundError("Hội thoại không tồn tại"));

        List<MessageResponse> messages = messageRepository
                .findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(MessageResponse::from)
                .toList();

        return ConversationDetailResponse.from(conversation, messages);
    }

    /**
     * Deletes / archives a conversation session.
     */
    @Transactional
    public void deleteConversation(UUID userId, UUID workspaceId, UUID conversationId) {
        validateAccess(userId, workspaceId);
        Conversation conversation = conversationRepository
                .findByUserIdAndIdAndStatus(userId, conversationId, "ACTIVE")
                .orElseThrow(() -> new NotFoundError("Hội thoại không tồn tại"));

        conversation.setStatus("DELETED");
        conversation.setUpdatedAt(Instant.now(clock));
        conversationRepository.save(conversation);
    }

    private void validateAccess(UUID userId, UUID workspaceId) {
        workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }
}
