package com.unichat.core.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.domain.RefreshFamilyRepository;
import com.unichat.core.auth.domain.RefreshToken;
import com.unichat.core.auth.domain.RefreshTokenRepository;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/** Commits expected refresh failures before the HTTP boundary throws an error. */
@Service
public class RefreshTransactions {
    private final RefreshTokenRepository tokens;
    private final RefreshFamilyRepository families;
    private final UserRepository users;
    private final AuditService audit;
    private final Clock clock;
    private final EntityManager entityManager;
    /** Acquires account locks before session locks to avoid revocation deadlocks. */
    public RefreshTransactions(RefreshTokenRepository tokens, RefreshFamilyRepository families,
            UserRepository users, AuditService audit, Clock clock, EntityManager entityManager) {
        this.tokens = tokens; this.families = families; this.users = users;
        this.audit = audit; this.clock = clock;
        this.entityManager = entityManager;
    }
    /** Rotates once or commits reuse revocation as an expected failure result. */
    @Transactional
    public Rotation rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return Rotation.denied();
        var existing = tokens.findByTokenHash(TokenHash.digest(rawToken));
        if (existing.isEmpty()) return Rotation.denied();
        User user = users.lockById(existing.get().getUserId()).orElse(null);
        if (user == null) return Rotation.denied();
        var family = families.lockById(existing.get().getFamilyId()).orElse(null);
        if (family == null) return Rotation.denied();
        // The initial lookup can precede another rotation's commit in this persistence context.
        entityManager.refresh(existing.get());
        RefreshToken token = existing.get();
        Instant now = Instant.now(clock);
        if (!family.isActive(now) || !token.getExpiresAt().isAfter(now) || token.getRevokedAt() != null)
            return Rotation.denied();
        if (token.getUsedAt() != null) {
            family.revoke(now);
            tokens.findByFamilyId(family.getId()).forEach(member -> member.setRevokedAt(now));
            audit.record(user.getId(), "AUTH_REFRESH_REUSE", "SESSION", family.getId(), "DENIED");
            return Rotation.denied();
        }
        if (user.getStatus() != UserStatus.ACTIVE) return Rotation.denied();
        return createSuccessor(token, user, now);
    }
    private Rotation createSuccessor(RefreshToken token, User user, Instant now) {
        String nextRaw = TokenHash.generate();
        RefreshToken next = new RefreshToken(UUID.randomUUID(), user.getId(), token.getFamilyId(),
                TokenHash.digest(nextRaw), token.getExpiresAt());
        token.setUsedAt(now);
        tokens.saveAndFlush(next);
        token.setReplacedById(next.getId());
        audit.record(user.getId(), "AUTH_REFRESH_SUCCESS", "SESSION", token.getFamilyId(), "SUCCESS");
        return new Rotation(user, token.getFamilyId(), nextRaw);
    }
    /** Revokes a session after serializing with any pending rotation. */
    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        tokens.findByTokenHash(TokenHash.digest(rawToken)).ifPresent(token -> {
            users.lockById(token.getUserId());
            families.lockById(token.getFamilyId()).ifPresent(family -> family.revoke(Instant.now(clock)));
            tokens.findByFamilyId(token.getFamilyId()).forEach(member -> member.setRevokedAt(Instant.now(clock)));
            audit.record(token.getUserId(), "AUTH_LOGOUT", "SESSION", token.getFamilyId(), "SUCCESS");
        });
    }
    /** Discriminated by the presence of an account; no credentials on denial. */
    public record Rotation(User user, UUID familyId, String rawToken) {
        /** Uniform expected authentication denial. */
        public static Rotation denied() { return new Rotation(null, null, null); }
        /** Whether rotation committed successfully. */
        public boolean accepted() { return user != null; }
    }
}
