package com.unichat.core.chat.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * Atomically updates the conversation summary using optimistic locking on summaryVersion.
     *
     * @return number of rows updated (0 if version mismatch due to concurrent modification)
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Conversation c SET c.summary = :summary, c.summaryVersion = :newVersion, c.updatedAt = :now "
            + "WHERE c.id = :id AND c.summaryVersion = :expectedVersion")
    int updateSummary(@Param("id") UUID id, @Param("summary") String summary,
                      @Param("newVersion") int newVersion, @Param("expectedVersion") int expectedVersion,
                      @Param("now") Instant now);
}

