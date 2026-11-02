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
    /**
     * Counts recent posts per workspace for a page of workspaces.
     *
     * <p>Answers "is anything happening here", which a total post count does
     * not: a group with 200 posts and none this month is dormant.
     *
     * @return rows of {workspaceId, count}; a workspace with none is absent
     */
    @Query("SELECT d.workspaceId, COUNT(d) FROM Discussion d "
            + "WHERE d.workspaceId IN :wsIds AND d.createdAt >= :since AND " + NOT_DELETED
            + " GROUP BY d.workspaceId")
    List<Object[]> countRecentGroupedByWorkspaceIds(@Param("wsIds") List<UUID> wsIds,
                                                    @Param("since") Instant since);

    /**
     * Every live post per workspace, however old.
     *
     * <p>The companion to {@link #countRecentGroupedByWorkspaceIds}: that one
     * answers "is anything happening here", this one answers "how much is
     * here", which is what a tab badge beside "Bài viết" claims to say.
     *
     * <p>Grouped for a whole page in one query, like the other card counts, so
     * a list of groups does not pay a query per card.
     *
     * @return rows of {workspaceId, count}; a workspace with none is absent
     */
    @Query("SELECT d.workspaceId, COUNT(d) FROM Discussion d "
            + "WHERE d.workspaceId IN :wsIds AND " + NOT_DELETED
            + " GROUP BY d.workspaceId")
    List<Object[]> countGroupedByWorkspaceIds(@Param("wsIds") List<UUID> wsIds);

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

    /** TOP sort with time range filter. */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND created_at >= :since "
            + "ORDER BY vote_score DESC, created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND created_at >= :since",
           nativeQuery = true)
    Page<Discussion> findTopSince(@Param("wsIds") List<UUID> wsIds, @Param("since") Instant since, Pageable p);

    /**
     * Questions nobody has answered yet — the actionable set for members who
     * can help. Newest first, because an unanswered question is most likely to
     * be answered while the person who asked is still around.
     *
     * <p>Restricted to questions. Without that the view also returned
     * discussions and announcements, neither of which has a resolution to
     * wait for, and the sidebar badge counted them as questions needing help.
     *
     * <p>"Unanswered" means <em>no replies at all</em>, not merely no accepted
     * answer. Those are different states and the UI already names them
     * differently — a question with replies and no accepted answer reads
     * "Đang thảo luận" on its card. Keying this on {@code accepted_reply_id}
     * alone made the tab badge disagree with the cards underneath it, and left
     * every question whose author never came back to press accept sitting in
     * the list for good. {@code reply_count} is maintained on the row, so this
     * stays one indexed scan.
     */
    @Query(value = "SELECT * FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND label = 'QUESTION' "
            + "AND accepted_reply_id IS NULL AND reply_count = 0 "
            + "ORDER BY created_at DESC",
           countQuery = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND label = 'QUESTION' "
            + "AND accepted_reply_id IS NULL AND reply_count = 0",
           nativeQuery = true)
    Page<Discussion> findUnanswered(@Param("wsIds") List<UUID> wsIds, Pageable p);

    /**
     * Counts unanswered questions for the feed tab badge.
     *
     * <p>Same rule as {@link #findUnanswered}, so the number on the tab is the
     * number of rows the tab opens.
     */
    @Query(value = "SELECT count(*) FROM discussions WHERE workspace_id IN :wsIds "
            + "AND status <> 'DELETED' AND label = 'QUESTION' "
            + "AND accepted_reply_id IS NULL AND reply_count = 0",
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
}
