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
}
