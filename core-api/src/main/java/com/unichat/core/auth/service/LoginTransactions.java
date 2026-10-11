package com.unichat.core.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/** Serializes login decisions and commits counters/audit before returning failure. */
@Service
public class LoginTransactions {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final AuditService audit;
    private final Clock clock;
    /** Keeps credential decisions and their evidence in one transaction. */
    public LoginTransactions(UserRepository users, PasswordEncoder passwords, TokenService tokens,
            AuditService audit, Clock clock) {
        this.users = users; this.passwords = passwords; this.tokens = tokens;
        this.audit = audit; this.clock = clock;
    }
    /** Expected denial is a value so it cannot roll back failed-login counters. */
    @Transactional
    public Decision authenticate(LoginRequest request) {
        User user = users.lockByEmail(request.email()).orElse(null);
        if (user == null) return deny(null);
        Instant now = Instant.now(clock);
        if (user.getStatus() != UserStatus.ACTIVE) return deny(user);
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) return deny(user);
        clearExpiredTemporaryLock(user, now);
        if (!passwords.matches(request.password(), user.getPasswordHash())) {
            recordFailure(user, now);
            return deny(user);
        }
        return issue(user, request.password(), now);
    }
    private void clearExpiredTemporaryLock(User user, Instant now) {
        if (user.getLockedUntil() == null || user.getLockedUntil().isAfter(now)) return;
        user.setLockedUntil(null); user.setFailedLoginCount(0);
    }
    private void recordFailure(User user, Instant now) {
        user.setFailedLoginCount(user.getFailedLoginCount() + 1);
        if (user.getFailedLoginCount() >= 5) user.setLockedUntil(now.plusSeconds(900));
        user.setUpdatedAt(now);
        users.save(user);
    }
    private Decision deny(User user) {
        UUID userId = user == null ? null : user.getId();
        audit.record(userId, "AUTH_LOGIN_FAILURE", "USER", userId, "DENIED");
        return new Decision(null);
    }
    private Decision issue(User user, String password, Instant now) {
        user.setFailedLoginCount(0); user.setLockedUntil(null); user.setUpdatedAt(now);
        if (passwords instanceof DelegatingPasswordEncoder && !user.getPasswordHash().startsWith("{argon2}"))
            user.setPasswordHash(passwords.encode(password));
        users.save(user);
        UUID familyId = UUID.randomUUID();
        String refresh = tokens.createRefreshToken(user.getId(), familyId);
        String access = tokens.generateAccessToken(user, familyId);
        audit.record(user.getId(), "AUTH_LOGIN_SUCCESS", "SESSION", familyId, "SUCCESS");
        return new Decision(new AuthService.TokenPair(access, refresh));
    }
    /** A null token pair represents an expected authentication denial. */
    public record Decision(AuthService.TokenPair tokens) { }
}
