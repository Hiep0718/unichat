package com.unichat.core.user.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Core User entity containing credentials, system roles, and account state.
 */
@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "system_role", nullable = false)
    private SystemRole systemRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private UserStatus status;

    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    /**
     * The name others see. Separate from the mention handle, which stays on the
     * email because it has to be unique and a display name does not.
     */
    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public User() {}

    /**
     * Constructs a new User.
     *
     * @param id user ID
     * @param email unique email address
     * @param passwordHash encoded password hash (Argon2id default, BCrypt legacy)
     * @param systemRole role (USER, ADMIN)
     * @param status account status (ACTIVE, LOCKED)
     * @param now creation and update timestamp
     */
    public User(UUID id, String email, String passwordHash, SystemRole systemRole, UserStatus status, Instant now) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.systemRole = systemRole;
        this.status = status;
        this.failedLoginCount = 0;
        // Matches what the product displayed before names existed; the member
        // can change it, and nothing looks empty until they do.
        this.displayName = defaultDisplayName(email);
        this.createdAt = now;
        this.updatedAt = now;
    }

    /** Longest name the column and the UI will carry. */
    public static final int MAX_DISPLAY_NAME = 50;

    private static String defaultDisplayName(String email) {
        String localPart = email == null ? "" : email.split("@")[0];
        return localPart.length() > MAX_DISPLAY_NAME
                ? localPart.substring(0, MAX_DISPLAY_NAME)
                : localPart;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * Renames the person as others see them.
     *
     * @throws IllegalArgumentException when blank or over the column's length,
     *                                  which the database would reject anyway
     */
    public void rename(String displayName) {
        String trimmed = displayName == null ? "" : displayName.trim();
        if (trimmed.isEmpty() || trimmed.length() > MAX_DISPLAY_NAME) {
            throw new IllegalArgumentException("Tên hiển thị phải từ 1 đến "
                    + MAX_DISPLAY_NAME + " ký tự");
        }
        this.displayName = trimmed;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public SystemRole getSystemRole() {
        return systemRole;
    }

    public void setSystemRole(SystemRole systemRole) {
        this.systemRole = systemRole;
    }

    public UserStatus getStatus() {
        return status;
    }

    public void setStatus(UserStatus status) {
        this.status = status;
    }

    public int getFailedLoginCount() {
        return failedLoginCount;
    }

    public void setFailedLoginCount(int failedLoginCount) {
        this.failedLoginCount = failedLoginCount;
    }

    public Instant getLockedUntil() {
        return lockedUntil;
    }

    public void setLockedUntil(Instant lockedUntil) {
        this.lockedUntil = lockedUntil;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
