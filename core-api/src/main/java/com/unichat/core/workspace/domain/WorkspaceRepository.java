package com.unichat.core.workspace.domain;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Gateway to Workspace database operations.
 */
public interface WorkspaceRepository extends JpaRepository<Workspace, UUID> {

    /**
     * Finds workspaces visible to a user (owned, member of, or public).
     *
     * @param userId   user requesting list
     * @param pageable pagination parameters
     * @return page of accessible workspaces
     */
    @Query("SELECT w FROM Workspace w WHERE " +
            "w.status = com.unichat.core.workspace.domain.WorkspaceStatus.ACTIVE AND (" +
            "w.ownerId = :userId " +
            "OR EXISTS (SELECT 1 FROM WorkspaceMember wm WHERE wm.workspaceId = w.id AND wm.userId = :userId AND wm.status = com.unichat.core.workspace.domain.WorkspaceMemberStatus.ACTIVE))")
    Page<Workspace> findAllVisibleToUser(@Param("userId") UUID userId, Pageable pageable);

    /**
     * The predicate behind discovery: active, public, and not already joined.
     *
     * <p>Shared by the two queries below so a change to who is discoverable
     * cannot apply to one and miss the other. A compile-time constant, which
     * is what an annotation value has to be.
     */
    String DISCOVERABLE = "FROM Workspace w WHERE "
            + "w.status = com.unichat.core.workspace.domain.WorkspaceStatus.ACTIVE "
            + "AND w.visibility = com.unichat.core.workspace.domain.WorkspaceVisibility.PUBLIC "
            + "AND NOT EXISTS (SELECT 1 FROM WorkspaceMember wm "
            + "WHERE wm.workspaceId = w.id AND wm.userId = :userId "
            + "AND wm.status = com.unichat.core.workspace.domain.WorkspaceMemberStatus.ACTIVE) "
            + "AND (LOWER(w.name) LIKE LOWER(:searchTerm) "
            + "OR LOWER(w.description) LIKE LOWER(:searchTerm)) ";

    /**
     * Ordering for discovery: liveliest first.
     *
     * <p>There was no ORDER BY here at all, so Postgres returned rows in
     * whatever order suited it — the list reshuffled between loads and paging
     * could repeat or skip a workspace. Recent activity leads because a group
     * that posted this week is worth more to a newcomer than a larger one that
     * has been silent for a month; id breaks ties so the order is total, which
     * is what makes paging stable.
     */
    String DISCOVERY_ORDER = "ORDER BY w.updatedAt DESC, w.id DESC";

    /**
     * Finds public workspaces the user is NOT already a member of.
     * Supports optional search by name or description.
     *
     * @param userId     user to exclude from membership check
     * @param searchTerm search filter (use '%' for no filter)
     * @param pageable   pagination parameters
     * @return page of discoverable public workspaces
     */
    @Query("SELECT w " + DISCOVERABLE + DISCOVERY_ORDER)
    Page<Workspace> findPublicWorkspacesExcludingMember(
            @Param("userId") UUID userId,
            @Param("searchTerm") String searchTerm,
            Pageable pageable);

    /**
     * The same set, narrowed to one topic.
     *
     * <p>A second method rather than a nullable parameter on the first: an
     * enum compared against a possibly-null bind variable inside JPQL is the
     * kind of thing that works until the day it does not, and the duplication
     * here is one line because the predicate is shared.
     *
     * @param topic the subject to filter by
     */
    @Query("SELECT w " + DISCOVERABLE
            + "AND EXISTS (SELECT 1 FROM WorkspaceTopicAssignment t "
            + "WHERE t.workspaceId = w.id AND t.topic = :topic) "
            + DISCOVERY_ORDER)
    Page<Workspace> findPublicWorkspacesByTopic(
            @Param("userId") UUID userId,
            @Param("searchTerm") String searchTerm,
            @Param("topic") WorkspaceTopic topic,
            Pageable pageable);
}
