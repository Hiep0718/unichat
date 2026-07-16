package com.unichat.core.shared.idempotency;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * Entity storing requests and responses to guarantee API idempotence.
 */
@Entity
@Table(name = "idempotency_records")
@IdClass(IdempotencyRecordId.class)
public class IdempotencyRecord {

    @Id
    @Column(name = "actor_id", nullable = false)
    private String actorId;

    @Id
    @Column(name = "route_key", nullable = false)
    private String routeKey;

    @Id
    @Column(name = "idempotency_key", nullable = false)
    private String idempotencyKey;

    @Column(name = "request_hash", nullable = false)
    private String requestHash;

    @Column(name = "response_status", nullable = false)
    private int responseStatus;

    @Column(name = "response_body", nullable = false)
    private String responseBody;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public IdempotencyRecord() {}

    /**
     * Constructs a new IdempotencyRecord.
     */
    public IdempotencyRecord(
            String actorId,
            String routeKey,
            String idempotencyKey,
            String requestHash,
            int responseStatus,
            String responseBody,
            Instant expiresAt) {
        this.actorId = actorId;
        this.routeKey = routeKey;
        this.idempotencyKey = idempotencyKey;
        this.requestHash = requestHash;
        this.responseStatus = responseStatus;
        this.responseBody = responseBody;
        this.expiresAt = expiresAt;
    }

    public String getActorId() {
        return actorId;
    }

    public String getRouteKey() {
        return routeKey;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public String getRequestHash() {
        return requestHash;
    }

    public int getResponseStatus() {
        return responseStatus;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}
