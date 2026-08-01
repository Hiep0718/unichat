package com.unichat.core.workspace.api;

import com.unichat.core.workspace.domain.WorkspaceRole;

import jakarta.validation.constraints.NotNull;

/**
 * Request body for changing a workspace member's role.
 * Only EDITOR and VIEWER roles are allowed; OWNER cannot be reassigned.
 */
public record UpdateMemberRoleRequest(
    @NotNull(message = "Vai trò không được để trống")
    WorkspaceRole role
) {}
