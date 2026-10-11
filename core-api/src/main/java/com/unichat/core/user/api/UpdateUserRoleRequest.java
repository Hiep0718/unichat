package com.unichat.core.user.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import com.unichat.core.user.domain.SystemRole;

/**
 * Payload for updating user system role (USER, ADMIN).
 */
public record UpdateUserRoleRequest(
        @NotNull(message = "Vai trò hệ thống không được để trống")
        SystemRole systemRole,
        @NotNull @PositiveOrZero Long expectedVersion
) {}
