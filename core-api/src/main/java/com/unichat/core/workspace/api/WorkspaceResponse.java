package com.unichat.core.workspace.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * Output representation of a workspace.
 */
public record WorkspaceResponse(
    UUID id,
    UUID ownerId,
    String name,
    String description,
    WorkspaceVisibility visibility,
    boolean cloudAllowed,
    long version,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Maps a Workspace entity to a WorkspaceResponse DTO.
     */
    public static WorkspaceResponse from(Workspace workspace) {
        return new WorkspaceResponse(
            workspace.getId(),
            workspace.getOwnerId(),
            workspace.getName(),
            workspace.getDescription(),
            workspace.getVisibility(),
            workspace.isCloudAllowed(),
            workspace.getVersion(),
            workspace.getCreatedAt(),
            workspace.getUpdatedAt()
        );
    }
}
