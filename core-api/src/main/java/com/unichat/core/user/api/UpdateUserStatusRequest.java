package com.unichat.core.user.api;

import jakarta.validation.constraints.NotNull;

import com.unichat.core.user.domain.UserStatus;

/**
 * Payload for updating user status (ACTIVE, LOCKED).
 */
public record UpdateUserStatusRequest(
        @NotNull(message = "Trạng thái tài khoản không được để trống")
        UserStatus status
) {}
