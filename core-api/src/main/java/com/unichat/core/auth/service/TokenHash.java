package com.unichat.core.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/** Existing SHA-256 strategy for high-entropy opaque tokens, with no secret logging. */
public final class TokenHash {
    private static final SecureRandom RANDOM = new SecureRandom();
    private TokenHash() { }
    /** Creates a 256-bit URL-safe refresh credential. */
    public static String generate() {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    /** Computes the persisted one-way token digest. */
    public static String digest(String token) {
        try {
            return Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 unavailable", error);
        }
    }
}
