package com.unichat.core.workspace.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Request payload for adding a member to a workspace.
 */
public record AddWorkspaceMemberRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        String email,

        @NotNull(message = "Vai trò không được để trống")
        WorkspaceRole role
) {}
