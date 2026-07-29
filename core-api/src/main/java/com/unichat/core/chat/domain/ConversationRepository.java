package com.unichat.core.chat.domain;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository interface for Conversation entity.
 */
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    /**
     * Finds conversations for a user in a workspace.
     */
    Page<Conversation> findByUserIdAndWorkspaceIdAndStatusOrderByUpdatedAtDesc(
            UUID userId, UUID workspaceId, String status, Pageable pageable);

    /**
     * Finds conversation by user ID and conversation ID.
     */
    Optional<Conversation> findByUserIdAndIdAndStatus(UUID userId, UUID id, String status);
}
