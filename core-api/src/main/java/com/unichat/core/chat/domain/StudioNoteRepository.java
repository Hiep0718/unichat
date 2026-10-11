package com.unichat.core.chat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository interface for managing StudioNote entities.
 */
@Repository
public interface StudioNoteRepository extends JpaRepository<StudioNote, UUID> {
    /** Pages only notes owned by the caller in the bound conversation. */
    org.springframework.data.domain.Page<StudioNote> findByConversationIdAndUserIdOrderByCreatedAtDescIdDesc(
            UUID conversationId, UUID userId, org.springframework.data.domain.Pageable pageable);

    List<StudioNote> findByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    List<StudioNote> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
