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

    /**
     * Whether the assistant has answered one discussion.
     *
     * <p>Used by the single-post paths, where there is one post to ask about.
     *
     * @param discussionId post to check
     * @return true when at least one reply on it was written by the assistant
     */
    @Query("SELECT count(r) > 0 FROM DiscussionReply r "
            + "WHERE r.discussionId = :discussionId AND r.isAiAnswer = true")
    boolean hasAiAnswer(@Param("discussionId") UUID discussionId);

    /**
     * Of the given discussions, those the assistant has answered.
     *
     * <p>One query for a whole page, because the post list draws this marker on
     * every card and asking per card is a query per row.
     *
     * @param discussionIds posts to check; an empty list yields an empty result
     * @return ids of the posts carrying at least one assistant reply
     */
    @Query("SELECT DISTINCT r.discussionId FROM DiscussionReply r "
            + "WHERE r.discussionId IN :discussionIds AND r.isAiAnswer = true")
    List<UUID> findIdsWithAiAnswer(@Param("discussionIds") List<UUID> discussionIds);
}
