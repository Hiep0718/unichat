package com.unichat.core.workspace.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A link that lets someone join a workspace.
 *
 * <p>Exists because inviting by email cannot reach a person who has no account
 * yet, and because Work Chat only reaches people who already share a workspace
 * with the sender — that is, the people who need no invitation. A link travels
 * wherever the sender can paste it.
 *
 * <p>Holds only the SHA-256 of the token, never the token itself, for the
 * reason a refresh token is held that way: a dump of this table must not yield
 * a set of working invitations. The raw value is returned once, at creation,
 * and cannot be recovered afterwards.
 *
 * @see WorkspaceInviteRepository
 */
@Entity
@Table(name = "workspace_invites")
public class WorkspaceInvite {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "workspace_id", nullable = false, updatable = false)
    private UUID workspaceId;

    /** SHA-256 of the token, hex encoded. The token itself is never stored. */
    @Column(name = "token_hash", nullable = false, updatable = false)
    private String tokenHash;

    /** Never OWNER: a forwarded link must not be able to give the group away. */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, updatable = false)
    private WorkspaceRole role;

    @Column(name = "created_by_id", nullable = false, updatable = false)
    private UUID createdById;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "max_uses", nullable = false, updatable = false)
    private int maxUses;

    @Column(name = "used_count", nullable = false)
    private int usedCount;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected WorkspaceInvite() {}

    public WorkspaceInvite(UUID id, UUID workspaceId, String tokenHash, WorkspaceRole role,
                           UUID createdById, Instant createdAt, Instant expiresAt, int maxUses) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.tokenHash = tokenHash;
        this.role = role;
        this.createdById = createdById;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.maxUses = maxUses;
        this.usedCount = 0;
    }

    public UUID getId() { return id; }
    public UUID getWorkspaceId() { return workspaceId; }
    public WorkspaceRole getRole() { return role; }
    public UUID getCreatedById() { return createdById; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getMaxUses() { return maxUses; }
    public int getUsedCount() { return usedCount; }
    public Instant getRevokedAt() { return revokedAt; }

    /** Uses still available, floored at zero. */
    public int getRemainingUses() {
        return Math.max(0, maxUses - usedCount);
    }

    /**
     * Whether this link still works.
     *
     * <p>Three ways to stop: the owner revoked it, it ran out of time, or it
     * ran out of uses. The caller is told the same thing for all three, so a
     * stranger holding a dead link learns nothing about which group it was for.
     *
     * @param now the moment to judge against, from the injected clock
     */
    public boolean isUsable(Instant now) {
        return revokedAt == null && now.isBefore(expiresAt) && getRemainingUses() > 0;
    }

    /**
     * Records one acceptance.
     *
     * <p>Called when a membership is actually created, never when the link is
     * previewed: the preview is public and chat clients fetch it on their own,
     * so counting there would let an unfurl bot spend the invitation.
     */
    public void recordUse() {
        this.usedCount++;
    }

    /** Stops the link immediately, without deleting the record of it. */
    public void revoke(Instant now) {
        if (revokedAt == null) {
            this.revokedAt = now;
        }
    }
}
