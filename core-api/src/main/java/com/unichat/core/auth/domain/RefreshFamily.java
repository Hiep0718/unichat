package com.unichat.core.auth.domain;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Durable session identity shared by every refresh token in a rotation family. */
@Entity
@Table(name = "refresh_families")
public class RefreshFamily {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;
    @Column(name = "revoked_at") private Instant revokedAt;
    protected RefreshFamily() { }
    /** Creates a session with an absolute expiry that rotation never extends. */
    public RefreshFamily(UUID id, UUID userId, Instant expiresAt) {
        this.id = id; this.userId = userId; this.expiresAt = expiresAt;
    }
    /** Session identifier included in the access sid claim. */
    public UUID getId() { return id; }
    /** Account owning this session. */
    public UUID getUserId() { return userId; }
    /** Absolute session expiry. */
    public Instant getExpiresAt() { return expiresAt; }
    /** Revocation timestamp, or null for an active session. */
    public Instant getRevokedAt() { return revokedAt; }
    /** Idempotently revokes the session. */
    public void revoke(Instant now) { if (revokedAt == null) revokedAt = now; }
    /** Tests session usability against the injected clock. */
    public boolean isActive(Instant now) { return revokedAt == null && expiresAt.isAfter(now); }
}
