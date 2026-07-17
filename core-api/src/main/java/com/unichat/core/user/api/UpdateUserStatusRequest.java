package com.unichat.core.user.api;

import jakarta.validation.constraints.NotNull;
import com.unichat.core.user.domain.UserStatus;

/**
 * Request body for updating a user's status.
 */
public record UpdateUserStatusRequest(
    @NotNull(message = "Trạng thái không được để trống")
    UserStatus status
) {}
