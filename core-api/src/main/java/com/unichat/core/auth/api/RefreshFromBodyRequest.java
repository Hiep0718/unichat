package com.unichat.core.auth.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

/**
 * Request payload for refreshing session tokens when using body-based transmission (mobile).
 */
public record RefreshFromBodyRequest(
    @NotBlank(message = "Refresh token không được để trống")
    @Size(min = 32, max = 512)
    @Pattern(regexp = "[A-Za-z0-9_-]+")
    String refreshToken
) {}
