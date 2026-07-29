package com.unichat.core.workspace.api;

import jakarta.validation.constraints.NotNull;

import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Request payload for updating a member's role in a workspace.
 */
public record UpdateWorkspaceMemberRequest(
        @NotNull(message = "Vai trò không được để trống")
        WorkspaceRole role
) {}
