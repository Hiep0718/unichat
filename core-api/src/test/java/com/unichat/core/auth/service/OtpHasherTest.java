package com.unichat.core.auth.service;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class OtpHasherTest {
    private final OtpHasher hasher = new OtpHasher("test-only-otp-secret-at-least-32-characters");
    @Test
    void shouldBindChallengeAccountCodeAndPurposeWithoutPlaintext() {
        UUID challenge = UUID.randomUUID();
        String hash = hasher.digest(challenge, "student@unichat.vn", "012345");
        assertTrue(hasher.matches(hash, challenge, "student@unichat.vn", "012345"));
        assertFalse(hasher.matches(hash, UUID.randomUUID(), "student@unichat.vn", "012345"));
        assertFalse(hasher.matches(hash, challenge, "other@unichat.vn", "012345"));
        assertFalse(hasher.matches(hash, challenge, "student@unichat.vn", "123456"));
        assertFalse(hash.contains("012345"));
    }
    @Test
    void shouldFailClosedWithAbsentOrShortSecret() {
        assertThrows(IllegalStateException.class, () -> new OtpHasher("").digest(UUID.randomUUID(), "email", "012345"));
        assertFalse(hasher.matches(null, UUID.randomUUID(), "email", "012345"));
    }
}
