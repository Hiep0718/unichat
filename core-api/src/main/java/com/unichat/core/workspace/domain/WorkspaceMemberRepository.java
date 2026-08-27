package com.unichat.core.workspace.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence layer for workspace membership connections.
 */
public interface WorkspaceMemberRepository extends JpaRepository<WorkspaceMember, WorkspaceMemberId> {

    /**
     * Finds active members of a workspace.
     *
     * @param workspaceId workspace ID
     * @param status membership status
     * @return list of matching members
     */
    List<WorkspaceMember> findByWorkspaceIdAndStatus(UUID workspaceId, WorkspaceMemberStatus status);

    List<WorkspaceMember> findByUserIdAndStatus(UUID userId, WorkspaceMemberStatus status);

    /**
     * Finds membership by workspace and user ID.
     */
    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(UUID workspaceId, UUID userId);

    /**
     * Finds active membership for authorization checks.
     */
    Optional<WorkspaceMember> findByWorkspaceIdAndUserIdAndStatus(UUID workspaceId, UUID userId, WorkspaceMemberStatus status);

    /**
     * Counts members of a workspace by status.
     *
     * @param workspaceId workspace ID
     * @param status membership status to filter
     * @return count of matching members
     */
    long countByWorkspaceIdAndStatus(UUID workspaceId, WorkspaceMemberStatus status);
}
