package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Queries over posts.
 *
 * <p>Every listing excludes soft-deleted posts. The filter lives in the queries
 * rather than in callers so a new listing cannot forget it.
 */
@Repository
public interface DiscussionRepository extends JpaRepository<Discussion, UUID> {

    String NOT_DELETED = "d.status <> 'DELETED'";

    /** Lists posts in one workspace, newest first. */
    @Query("SELECT d FROM Discussion d WHERE d.workspaceId = :wsId AND " + NOT_DELETED
            + " ORDER BY d.pinned DESC, d.createdAt DESC")
    Page<Discussion> findByWorkspaceIdOrderByCreatedAtDesc(@Param("wsId") UUID wsId, Pageable p);

    /** Lists posts in one workspace, most helpful first. */
    @Query("SELECT d FROM Discussion d WHERE d.workspaceId = :wsId AND " + NOT_DELETED
            + " ORDER BY d.pinned DESC, d.voteScore DESC, d.createdAt DESC")
    Page<Discussion> findByWorkspaceIdOrderByVoteScoreDescCreatedAtDesc(
            @Param("wsId") UUID wsId, Pageable p);

    /** Lists posts in one workspace filtered by label. */
    @Query("SELECT d FROM Discussion d WHERE d.workspaceId = :wsId AND d.label = :label AND "
            + NOT_DELETED + " ORDER BY d.pinned DESC, d.createdAt DESC")
    Page<Discussion> findByWorkspaceIdAndLabel(
            @Param("wsId") UUID wsId, @Param("label") String label, Pageable p);

    /* ---------- Feed across several workspaces ---------- */

    @Query("SELECT d FROM Discussion d WHERE d.workspaceId IN :wsIds AND " + NOT_DELETED
            + " ORDER BY d.createdAt DESC")
    Page<Discussion> findByWorkspaceIdInOrderByCreatedAtDesc(
            @Param("wsIds") List<UUID> wsIds, Pageable p);

    @Query("SELECT d FROM Discussion d WHERE d.workspaceId IN :wsIds AND " + NOT_DELETED
            + " ORDER BY d.voteScore DESC, d.createdAt DESC")
    Page<Discussion> findByWorkspaceIdInOrderByVoteScoreDescCreatedAtDesc(
            @Param("wsIds") List<UUID> wsIds, Pageable p);

    /** Posts written by the current user. */
    @Query("SELECT d FROM Discussion d WHERE d.workspaceId IN :wsIds AND d.authorId = :authorId AND "
            + NOT_DELETED + " ORDER BY d.createdAt DESC")
    Page<Discussion> findByWorkspaceIdInAndAuthorIdOrderByCreatedAtDesc(
            @Param("wsIds") List<UUID> wsIds, @Param("authorId") UUID authorId, Pageable p);

    /** Full-text search across title and body. */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' "
            + "AND to_tsvector('simple', title || ' ' || body) @@ plainto_tsquery('simple', :q) "
            + "ORDER BY vote_score DESC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' "
            + "AND to_tsvector('simple', title || ' ' || body) @@ plainto_tsquery('simple', :q)",
           nativeQuery = true)
    Page<Discussion> searchByKeyword(@Param("wsIds") List<UUID> wsIds, @Param("q") String q, Pageable p);

    /** Posts a member wrote, within groups the caller can see. */
    @Query("SELECT count(d) FROM Discussion d WHERE d.authorId = :userId "
            + "AND d.workspaceId IN :wsIds AND " + NOT_DELETED)
    long countPostsBy(@Param("userId") UUID userId, @Param("wsIds") List<UUID> wsIds);

    /**
     * Questions resolved by an answer this member wrote.
     *
     * <p>The measure of a helpful member is not how much they posted but how
     * often the asker marked their reply as the one that settled it.
     */
    @Query("SELECT count(d) FROM Discussion d WHERE d.workspaceId IN :wsIds AND " + NOT_DELETED
            + " AND d.acceptedReplyId IN "
            + "(SELECT r.id FROM DiscussionReply r WHERE r.authorId = :userId)")
    long countAcceptedAnswersBy(@Param("userId") UUID userId, @Param("wsIds") List<UUID> wsIds);

    /**
     * Tags on questions this member has replied to, most frequent first.
     *
     * <p>What someone answers about says more about where to send a question
     * than what they ask about. Native because the tags are a jsonb array.
     *
     * @return rows of [tag, count]
     */
    @Query(value = "SELECT tag, count(*) AS uses "
            + "FROM discussions d, jsonb_array_elements_text(d.tags) AS tag "
            + "WHERE d.workspace_id IN :wsIds AND d.status <> 'DELETED' "
            + "AND EXISTS (SELECT 1 FROM discussion_replies r "
            + "            WHERE r.discussion_id = d.id AND r.author_id = :userId) "
            + "GROUP BY tag ORDER BY uses DESC LIMIT 5",
           nativeQuery = true)
    List<Object[]> findTopTagsAnsweredBy(@Param("userId") UUID userId,
                                         @Param("wsIds") List<UUID> wsIds);

    /** Filter by JSONB tag containment. */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND tags @> cast(:tag as jsonb) "
            + "ORDER BY vote_score DESC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND tags @> cast(:tag as jsonb)",
           nativeQuery = true)
    Page<Discussion> findByTag(@Param("wsIds") List<UUID> wsIds, @Param("tag") String tag, Pageable p);

    /** TOP sort with time range filter. */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND created_at >= :since "
            + "ORDER BY vote_score DESC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND created_at >= :since",
           nativeQuery = true)
    Page<Discussion> findTopSince(@Param("wsIds") List<UUID> wsIds, @Param("since") Instant since, Pageable p);

    /**
     * Questions still waiting for a resolution — the actionable set for members
     * who can help. Ordered oldest-unanswered first so nothing is forgotten.
     */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND accepted_reply_id IS NULL "
            + "ORDER BY reply_count ASC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND accepted_reply_id IS NULL",
           nativeQuery = true)
    Page<Discussion> findUnanswered(@Param("wsIds") List<UUID> wsIds, Pageable p);

    /** Counts unanswered questions, for the feed tab badge. */
    @Query(value = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND accepted_reply_id IS NULL",
           nativeQuery = true)
    long countUnanswered(@Param("wsIds") List<UUID> wsIds);

    /** Posts the user bookmarked, newest bookmark first. */
    @Query(value = "SELECT d.* FROM discussions d "
            + "JOIN bookmarks b ON b.discussion_id = d.id "
            + "WHERE b.user_id = :userId AND d.workspace_id IN :wsIds AND d.status <> 'DELETED' "
            + "ORDER BY b.created_at DESC",
           countQuery = "SELECT count(*) FROM discussions d "
            + "JOIN bookmarks b ON b.discussion_id = d.id "
            + "WHERE b.user_id = :userId AND d.workspace_id IN :wsIds AND d.status <> 'DELETED'",
           nativeQuery = true)
    Page<Discussion> findBookmarked(@Param("userId") UUID userId,
                                    @Param("wsIds") List<UUID> wsIds, Pageable p);

    /** Trending tags — top tags by frequency in the last 7 days. */
    @Query(value = "SELECT tag, count(*) as cnt FROM discussions, "
            + "jsonb_array_elements_text(tags) AS tag "
            + "WHERE workspace_id IN :wsIds AND status <> 'DELETED' "
            + "AND created_at >= NOW() - INTERVAL '7 days' "
            + "GROUP BY tag ORDER BY cnt DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findTrendingTags(@Param("wsIds") List<UUID> wsIds, @Param("limit") int limit);
}
