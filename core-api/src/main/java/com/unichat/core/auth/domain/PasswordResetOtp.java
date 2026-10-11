package com.unichat.core.auth.domain;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A bounded reset challenge; the plaintext OTP is never persisted. */
@Entity
@Table(name = "password_reset_otps")
public class PasswordResetOtp {
    @Id @Column(nullable = false) private String email;
    @Column(name = "challenge_id", nullable = false) private UUID challengeId;
    @Column(name = "otp_hash") private String otpHash;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(nullable = false) private int attempts;
    @Column(name = "consumed_at") private Instant consumedAt;
    protected PasswordResetOtp() { }
    /** Creates a replacement challenge; older codes no longer match. */
    public PasswordResetOtp(String email, UUID challengeId, String otpHash, Instant expiresAt, Instant createdAt) {
        this.email = email; this.challengeId = challengeId; this.otpHash = otpHash;
        this.expiresAt = expiresAt; this.createdAt = createdAt;
    }
    /** Canonical account address. */
    public String getEmail() { return email; }
    /** Identity included in the HMAC. */
    public UUID getChallengeId() { return challengeId; }
    /** Persisted digest only. */
    public String getOtpHash() { return otpHash; }
    /** Absolute validity deadline. */
    public Instant getExpiresAt() { return expiresAt; }
    /** Last resend timestamp. */
    public Instant getCreatedAt() { return createdAt; }
    /** Attempts already consumed. */
    public int getAttempts() { return attempts; }
    /** Successful consumption timestamp. */
    public Instant getConsumedAt() { return consumedAt; }
    /** Counts an invalid attempt without exceeding the maximum. */
    public void failAttempt() { attempts = Math.min(5, attempts + 1); }
    /** Atomically consumes the challenge under the account row lock. */
    public void consume(Instant now) { consumedAt = now; }
    /** Whether a challenge can still be verified. */
    public boolean isUsable(Instant now) {
        return otpHash != null && consumedAt == null && attempts < 5 && expiresAt.isAfter(now);
    }
}