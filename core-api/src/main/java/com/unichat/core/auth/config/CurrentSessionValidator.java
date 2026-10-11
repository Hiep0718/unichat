package com.unichat.core.auth.config;

import java.util.UUID;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import com.unichat.core.auth.service.SessionStateService;

/** Validates live account/session state after RS256 issuer/audience verification. */
@Component
public class CurrentSessionValidator implements OAuth2TokenValidator<Jwt> {
    private final SessionStateService sessions;
    /** Reuses the Core-owned authoritative session checker. */
    public CurrentSessionValidator(SessionStateService sessions) { this.sessions = sessions; }
    /** Rejects malformed, revoked or stale credentials uniformly. */
    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        try {
            Number revision = token.getClaim("securityVersion");
            UUID userId = UUID.fromString(token.getSubject());
            UUID familyId = UUID.fromString(token.getClaimAsString("sid"));
            if (revision != null && revision.longValue() >= 0 && sessions.isActive(userId, familyId, revision.longValue()))
                return OAuth2TokenValidatorResult.success();
        } catch (IllegalArgumentException | NullPointerException | ClassCastException ignored) {
            return denied();
        }
        return denied();
    }
    private OAuth2TokenValidatorResult denied() {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Phiên đăng nhập không còn hợp lệ.", null));
    }
}
