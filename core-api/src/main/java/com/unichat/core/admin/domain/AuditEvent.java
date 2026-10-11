package com.unichat.core.admin.domain;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Append-only security metadata; never contains credentials or user content. */
@Entity
@Table(name = "audit_events")
public class AuditEvent {
    @Id private UUID id;
    @Column(name = "occurred_at", nullable = false) private Instant occurredAt;
    @Column(name = "request_id") private String requestId;
    @Column(name = "actor_id") private UUID actorId;
    @Column(nullable = false) private String action;
    @Column(name = "target_type") private String targetType;
    @Column(name = "target_id") private UUID targetId;
    @Column(nullable = false) private String outcome;
    protected AuditEvent() { }
    /** Creates an immutable event in the business transaction. */
    public AuditEvent(UUID id, Instant occurredAt, String requestId, UUID actorId,
            String action, String targetType, UUID targetId, String outcome) {
        this.id = id; this.occurredAt = occurredAt; this.requestId = requestId;
        this.actorId = actorId; this.action = action; this.targetType = targetType;
        this.targetId = targetId; this.outcome = outcome;
    }
    /** Stable identifier for deduplication. */
    public UUID getId() { return id; }
    /** Server event timestamp. */
    public Instant getOccurredAt() { return occurredAt; }
    /** Correlation identifier only. */
    public String getRequestId() { return requestId; }
    /** Acting account, nullable for anonymous failures. */
    public UUID getActorId() { return actorId; }
    /** Stable operation action. */
    public String getAction() { return action; }
    /** Resource kind without content. */
    public String getTargetType() { return targetType; }
    /** Resource identifier without content. */
    public UUID getTargetId() { return targetId; }
    /** SUCCESS, FAILURE or DENIED. */
    public String getOutcome() { return outcome; }
}
