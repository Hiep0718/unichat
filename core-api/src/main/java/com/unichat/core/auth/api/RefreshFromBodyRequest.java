package com.unichat.core.auth.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for refreshing session tokens when using body-based transmission (mobile).
 */
public record RefreshFromBodyRequest(
    @NotBlank(message = "Refresh token không được để trống")
    String refreshToken
) {}
