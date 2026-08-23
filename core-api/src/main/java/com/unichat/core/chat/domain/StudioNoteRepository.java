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

    List<StudioNote> findByConversationIdOrderByCreatedAtDesc(UUID conversationId);

    List<StudioNote> findByWorkspaceIdOrderByCreatedAtDesc(UUID workspaceId);
}
