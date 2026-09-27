package com.unichat.core.auth.api;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for revoking session tokens when using body-based transmission (mobile).
 */
public record LogoutFromBodyRequest(
    @NotBlank(message = "Refresh token không được để trống")
    String refreshToken
) {}
