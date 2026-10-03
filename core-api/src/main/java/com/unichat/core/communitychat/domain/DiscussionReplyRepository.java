package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionReplyRepository extends JpaRepository<DiscussionReply, UUID> {
    
    /**
     * Lists all replies for a discussion, ordered by creation time.
     */
    List<DiscussionReply> findByDiscussionIdOrderByCreatedAtAsc(UUID discussionId);

    /**
     * Replies a member wrote, within groups the caller can see.
     *
     * <p>Scoped through the parent post, since a reply carries no workspace of
     * its own.
     */
    @Query("SELECT count(r) FROM DiscussionReply r WHERE r.authorId = :userId "
            + "AND r.discussionId IN "
            + "(SELECT d.id FROM Discussion d WHERE d.workspaceId IN :wsIds "
            + " AND d.status <> 'DELETED')")
    long countRepliesBy(@Param("userId") UUID userId, @Param("wsIds") List<UUID> wsIds);
}
