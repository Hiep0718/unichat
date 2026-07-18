package com.unichat.core.auth.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Entity for storing OTP generated during password reset.
 */
@Entity
@Table(name = "password_reset_otps")
public class PasswordResetOtp {

    @Id
    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "otp_code", nullable = false, length = 6)
    private String otpCode;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public PasswordResetOtp() {}

    public PasswordResetOtp(String email, String otpCode, Instant expiresAt, Instant createdAt) {
        this.email = email;
        this.otpCode = otpCode;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getOtpCode() {
        return otpCode;
    }

    public void setOtpCode(String otpCode) {
        this.otpCode = otpCode;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
