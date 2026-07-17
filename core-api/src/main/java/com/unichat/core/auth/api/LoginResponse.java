package com.unichat.core.auth.api;

/**
 * Output response body after successful user authentication.
 */
public record LoginResponse(
    String accessToken,
    String tokenType,
    long expiresIn
) {}
