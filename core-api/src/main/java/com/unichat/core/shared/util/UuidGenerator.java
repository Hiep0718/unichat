package com.unichat.core.shared.util;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

/**
 * Thread-safe generation of time-based UUIDv7 identifiers.
 */
public final class UuidGenerator {
    private static final SecureRandom random = new SecureRandom();

    private UuidGenerator() {}

    /**
     * Generates a new UUID v7.
     */
    public static UUID generateV7() {
        long value = Instant.now().toEpochMilli();
        long mostSigBits = (value << 16) & 0xFFFFFFFFFFFF0000L;
        mostSigBits |= 0x7000L; // Version 7
        mostSigBits |= random.nextInt() & 0x0FFFL;

        long leastSigBits = 0x8000000000000000L; // Variant 2 (RFC 4122)
        leastSigBits |= random.nextLong() & 0x3FFFFFFFFFFFFFFFL;

        return new UUID(mostSigBits, leastSigBits);
    }
}
