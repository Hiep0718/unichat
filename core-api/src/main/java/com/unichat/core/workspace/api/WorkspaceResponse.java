package com.unichat.core.workspace.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Output representation of a workspace including aggregated stats
 * and the requesting user's role within that workspace.
 */
public record WorkspaceResponse(
    UUID id,
    UUID ownerId,
    String name,
    String description,
    WorkspaceVisibility visibility,
    boolean cloudAllowed,
    long documentCount,
    long memberCount,
    long version,
    Instant createdAt,
    Instant updatedAt,
    WorkspaceRole userRole
) {
    /**
     * Maps a Workspace entity to a WorkspaceResponse DTO with counts and user role.
     *
     * @param workspace     the workspace entity
     * @param documentCount number of non-deleted documents in the workspace
     * @param memberCount   number of active members in the workspace
     * @param userRole      role of the requesting user, null if not a member
     */
    public static WorkspaceResponse from(
            Workspace workspace,
            long documentCount,
            long memberCount,
            WorkspaceRole userRole) {
        return new WorkspaceResponse(
            workspace.getId(),
            workspace.getOwnerId(),
            workspace.getName(),
            workspace.getDescription(),
            workspace.getVisibility(),
            workspace.isCloudAllowed(),
            documentCount,
            memberCount,
            workspace.getVersion(),
            workspace.getCreatedAt(),
            workspace.getUpdatedAt(),
            userRole
        );
    }
}
