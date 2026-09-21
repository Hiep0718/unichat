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

@Repository
public interface DiscussionRepository extends JpaRepository<Discussion, UUID> {

    /**
     * Lists discussions in a workspace, usually sorted by pinned DESC, updated_at DESC.
     */
    Page<Discussion> findByWorkspaceId(UUID workspaceId, Pageable pageable);

    /**
     * Lists discussions filtered by label.
     */
    Page<Discussion> findByWorkspaceIdAndLabel(UUID workspaceId, String label, Pageable pageable);

    // Feed: lấy bài từ nhiều workspace
    Page<Discussion> findByWorkspaceIdInOrderByVoteScoreDescCreatedAtDesc(List<UUID> wsIds, Pageable p);
    Page<Discussion> findByWorkspaceIdInOrderByCreatedAtDesc(List<UUID> wsIds, Pageable p);

    // Workspace page: lấy bài 1 workspace
    Page<Discussion> findByWorkspaceIdOrderByVoteScoreDescCreatedAtDesc(UUID wsId, Pageable p);
    Page<Discussion> findByWorkspaceIdOrderByCreatedAtDesc(UUID wsId, Pageable p);

    /** Full-text search across title and body. */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND to_tsvector('simple', title || ' ' || body) @@ plainto_tsquery('simple', :q) "
            + "ORDER BY vote_score DESC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND to_tsvector('simple', title || ' ' || body) @@ plainto_tsquery('simple', :q)",
           nativeQuery = true)
    Page<Discussion> searchByKeyword(@Param("wsIds") List<UUID> wsIds, @Param("q") String q, Pageable p);

    /** Filter by JSONB tag containment. */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND tags @> cast(:tag as jsonb) "
            + "ORDER BY vote_score DESC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND tags @> cast(:tag as jsonb)",
           nativeQuery = true)
    Page<Discussion> findByTag(@Param("wsIds") List<UUID> wsIds, @Param("tag") String tag, Pageable p);

    /** TOP sort with time range filter. */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND created_at >= :since ORDER BY vote_score DESC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND created_at >= :since",
           nativeQuery = true)
    Page<Discussion> findTopSince(@Param("wsIds") List<UUID> wsIds, @Param("since") Instant since, Pageable p);

    /**
     * Questions still waiting for a resolution — the actionable set for members
     * who can help. Ordered oldest-unanswered first so nothing is forgotten.
     */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND accepted_reply_id IS NULL "
            + "ORDER BY reply_count ASC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND accepted_reply_id IS NULL",
           nativeQuery = true)
    Page<Discussion> findUnanswered(@Param("wsIds") List<UUID> wsIds, Pageable p);

    /** Counts unanswered questions, for the feed tab badge. */
    @Query(value = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND accepted_reply_id IS NULL",
           nativeQuery = true)
    long countUnanswered(@Param("wsIds") List<UUID> wsIds);

    /** Posts written by the current user. */
    Page<Discussion> findByWorkspaceIdInAndAuthorIdOrderByCreatedAtDesc(
            List<UUID> wsIds, UUID authorId, Pageable p);

    /** Posts the user bookmarked, newest bookmark first. */
    @Query(value = "SELECT d.* FROM discussions d "
            + "JOIN bookmarks b ON b.discussion_id = d.id "
            + "WHERE b.user_id = :userId AND d.workspace_id IN :wsIds "
            + "ORDER BY b.created_at DESC",
           countQuery = "SELECT count(*) FROM discussions d "
            + "JOIN bookmarks b ON b.discussion_id = d.id "
            + "WHERE b.user_id = :userId AND d.workspace_id IN :wsIds",
           nativeQuery = true)
    Page<Discussion> findBookmarked(@Param("userId") UUID userId,
                                    @Param("wsIds") List<UUID> wsIds, Pageable p);

    /** Trending tags — top tags by frequency in the last 7 days. */
    @Query(value = "SELECT tag, count(*) as cnt FROM discussions, "
            + "jsonb_array_elements_text(tags) AS tag "
            + "WHERE workspace_id IN :wsIds "
            + "AND created_at >= NOW() - INTERVAL '7 days' "
            + "GROUP BY tag ORDER BY cnt DESC LIMIT :limit",
           nativeQuery = true)
    List<Object[]> findTrendingTags(@Param("wsIds") List<UUID> wsIds, @Param("limit") int limit);
}

