package com.unichat.core.auth.api;

/**
 * Authentication response payload for mobile clients containing both access and refresh tokens.
 */
public record MobileLoginResponse(
    String accessToken,
    String refreshToken,
    String tokenType,
    long expiresIn
) {}
