package com.unichat.core.workspace.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * Counts members per workspace for a page of workspaces.
     *
     * @return rows of {workspaceId, count}; a workspace with none is absent
     */
    @Query("SELECT m.workspaceId, COUNT(m) FROM WorkspaceMember m "
            + "WHERE m.workspaceId IN :workspaceIds AND m.status = :status "
            + "GROUP BY m.workspaceId")
    List<Object[]> countGroupedByWorkspaceIds(@Param("workspaceIds") List<UUID> workspaceIds,
                                             @Param("status") WorkspaceMemberStatus status);

    /**
     * Picks a few members of each workspace to show as faces on its card.
     *
     * <p>Ranked inside the query so the limit applies per workspace: fetching
     * every member of every listed group and trimming in Java would read the
     * whole membership table for a page of large groups.
     *
     * @return rows of {workspaceId, userId, displayName, hasAvatar, avatarColor},
     *         owners first, then by name
     */
    @Query(value = "SELECT workspace_id, user_id, display_name, has_avatar, avatar_color FROM ("
            + "  SELECT m.workspace_id, u.id AS user_id, u.display_name,"
            + "         (u.avatar_storage_key IS NOT NULL) AS has_avatar, u.avatar_color,"
            + "         ROW_NUMBER() OVER ("
            + "             PARTITION BY m.workspace_id"
            + "             ORDER BY CASE m.role WHEN 'OWNER' THEN 0 WHEN 'EDITOR' THEN 1 ELSE 2 END,"
            + "                      u.display_name"
            + "         ) AS rn"
            + "  FROM workspace_members m JOIN users u ON u.id = m.user_id"
            + "  WHERE m.workspace_id IN :workspaceIds AND m.status = 'ACTIVE'"
            + ") ranked WHERE rn <= :perWorkspace",
            nativeQuery = true)
    List<Object[]> findFacesForWorkspaces(@Param("workspaceIds") List<UUID> workspaceIds,
                                          @Param("perWorkspace") int perWorkspace);

    /**
     * Counts members of a workspace by status.
     *
     * @param workspaceId workspace ID
     * @param status membership status to filter
     * @return count of matching members
     */
    long countByWorkspaceIdAndStatus(UUID workspaceId, WorkspaceMemberStatus status);
}
