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
     * Finds public workspaces the user is NOT already a member of.
     * Supports optional search by name or description.
     *
     * @param userId     user to exclude from membership check
     * @param searchTerm search filter (use '%' for no filter)
     * @param pageable   pagination parameters
     * @return page of discoverable public workspaces
     */
    @Query("SELECT w FROM Workspace w WHERE " +
            "w.status = com.unichat.core.workspace.domain.WorkspaceStatus.ACTIVE " +
            "AND w.visibility = com.unichat.core.workspace.domain.WorkspaceVisibility.PUBLIC " +
            "AND NOT EXISTS (SELECT 1 FROM WorkspaceMember wm " +
            "WHERE wm.workspaceId = w.id AND wm.userId = :userId " +
            "AND wm.status = com.unichat.core.workspace.domain.WorkspaceMemberStatus.ACTIVE) " +
            "AND (LOWER(w.name) LIKE LOWER(:searchTerm) " +
            "OR LOWER(w.description) LIKE LOWER(:searchTerm))")
    Page<Workspace> findPublicWorkspacesExcludingMember(
            @Param("userId") UUID userId,
            @Param("searchTerm") String searchTerm,
            Pageable pageable);
}
