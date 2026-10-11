package com.unichat.core.auth.service;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.auth.api.ResetPasswordRequest;
import com.unichat.core.auth.domain.PasswordResetOtp;
import com.unichat.core.auth.domain.PasswordResetOtpRepository;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;

/** Serializes resend/verification/password mutation without holding a transaction over SMTP. */
@Service
public class PasswordResetTransactions {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserRepository users;
    private final PasswordResetOtpRepository challenges;
    private final OtpHasher hasher;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final AuditService audit;
    private final Clock clock;
    /** Requires the same account mutex used by login and session revocation. */
    public PasswordResetTransactions(UserRepository users, PasswordResetOtpRepository challenges,
            OtpHasher hasher, PasswordEncoder passwords, TokenService tokens, AuditService audit, Clock clock) {
        this.users = users; this.challenges = challenges; this.hasher = hasher;
        this.passwords = passwords; this.tokens = tokens; this.audit = audit; this.clock = clock;
    }
    /** Returns delivery data after commit; cooldown/unknown account retain the uniform response. */
    @Transactional
    public Delivery prepare(String suppliedEmail) {
        String email = suppliedEmail.strip().toLowerCase(Locale.ROOT);
        User user = users.lockByEmail(email).orElse(null);
        if (user == null) return null;
        Instant now = Instant.now(clock);
        var existing = challenges.findByEmailIgnoreCase(email);
        if (existing.isPresent() && existing.get().getCreatedAt().plusSeconds(60).isAfter(now)) return null;
        UUID challengeId = UUID.randomUUID();
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        challenges.save(new PasswordResetOtp(email, challengeId,
                hasher.digest(challengeId, email, code), now.plusSeconds(300), now));
        audit.record(user.getId(), "AUTH_RESET_REQUEST", "USER", user.getId(), "SUCCESS");
        return new Delivery(user.getId(), email, code);
    }
    /** Returns expected denial so attempt counts survive the transaction boundary. */
    @Transactional
    public boolean reset(ResetPasswordRequest request) {
        String email = request.email().strip().toLowerCase(Locale.ROOT);
        User user = users.lockByEmail(email).orElse(null);
        if (user == null) return false;
        PasswordResetOtp challenge = challenges.findByEmailIgnoreCase(email).orElse(null);
        Instant now = Instant.now(clock);
        if (challenge == null || !challenge.isUsable(now)) return denied(user);
        if (!hasher.matches(challenge.getOtpHash(), challenge.getChallengeId(), email, request.otp())) {
            challenge.failAttempt(); challenges.save(challenge);
            return denied(user);
        }
        challenge.consume(now); challenges.save(challenge);
        user.setPasswordHash(passwords.encode(request.newPassword()));
        user.invalidateCredentials(); user.setFailedLoginCount(0); user.setLockedUntil(null);
        user.setUpdatedAt(now); users.save(user);
        tokens.revokeAllTokensByUser(user.getId());
        audit.record(user.getId(), "AUTH_PASSWORD_RESET", "USER", user.getId(), "SUCCESS");
        return true;
    }
    private boolean denied(User user) {
        audit.record(user.getId(), "AUTH_RESET_FAILURE", "USER", user.getId(), "DENIED");
        return false;
    }
    /** Persists mail outcome without content, outside the credential transaction. */
    @Transactional
    public void recordDelivery(UUID userId, boolean success) {
        audit.record(userId, "AUTH_RESET_DELIVERY", "USER", userId, success ? "SUCCESS" : "FAILURE");
    }
    /** Ephemeral delivery data; this type must never be serialized or logged. */
    public record Delivery(UUID userId, String email, String code) { }
}