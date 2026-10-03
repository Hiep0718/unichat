package com.unichat.core.workspace.api;

import java.time.Instant;
import java.util.List;
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
    /** Posts in the last week, so a dormant group reads as dormant. */
    long recentPostCount,
    /** A few members to draw as faces on the card, owners first. */
    List<WorkspaceCardStats.MemberFace> faces,
    /** True when a cover was uploaded; otherwise the card draws a gradient. */
    boolean hasCover,
    long version,
    Instant createdAt,
    Instant updatedAt,
    WorkspaceRole userRole
) {
    /**
     * Maps a Workspace entity to a response, carrying the card statistics
     * gathered for the whole page.
     *
     * @param workspace the workspace entity
     * @param stats     counts and faces for this workspace, never null
     * @param userRole  role of the requesting user, null if not a member
     */
    public static WorkspaceResponse from(
            Workspace workspace,
            WorkspaceCardStats stats,
            WorkspaceRole userRole) {
        return new WorkspaceResponse(
            workspace.getId(),
            workspace.getOwnerId(),
            workspace.getName(),
            workspace.getDescription(),
            workspace.getVisibility(),
            workspace.isCloudAllowed(),
            stats.documentCount(),
            stats.memberCount(),
            stats.recentPostCount(),
            stats.faces(),
            workspace.hasCoverImage(),
            workspace.getVersion(),
            workspace.getCreatedAt(),
            workspace.getUpdatedAt(),
            userRole
        );
    }
}
