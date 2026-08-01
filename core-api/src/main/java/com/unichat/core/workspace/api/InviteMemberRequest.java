package com.unichat.core.workspace.api;

import com.unichat.core.workspace.domain.WorkspaceRole;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for inviting a new member to a workspace.
 * Only EDITOR and VIEWER roles are allowed; OWNER cannot be assigned via invite.
 */
public record InviteMemberRequest(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    String email,

    @NotNull(message = "Vai trò không được để trống")
    WorkspaceRole role
) {}
