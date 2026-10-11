package com.unichat.core.chat.service;

import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import com.unichat.core.common.error.UnauthenticatedError;

/** Identity and durable session revision captured when an operation is reserved. */
public record ChatActor(UUID userId, UUID sessionId, long securityVersion) {
    /** Extracts mandatory claims without trusting stale role data. */
    public static ChatActor from(Jwt token) {
        try {
            Number revision = token.getClaim("securityVersion");
            return new ChatActor(UUID.fromString(token.getSubject()),
                    UUID.fromString(token.getClaimAsString("sid")), revision.longValue());
        } catch (RuntimeException error) { throw new UnauthenticatedError("Phiên đăng nhập không hợp lệ."); }
    }
}
