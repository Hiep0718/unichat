package com.unichat.core.shared.idempotency;

import java.io.Serializable;
import java.util.Objects;

/**
 * Composite primary key for IdempotencyRecord.
 */
public class IdempotencyRecordId implements Serializable {

    private static final long serialVersionUID = 1L;

    private String actorId;
    private String routeKey;
    private String idempotencyKey;

    public IdempotencyRecordId() {}

    public IdempotencyRecordId(String actorId, String routeKey, String idempotencyKey) {
        this.actorId = actorId;
        this.routeKey = routeKey;
        this.idempotencyKey = idempotencyKey;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        IdempotencyRecordId that = (IdempotencyRecordId) o;
        return Objects.equals(actorId, that.actorId) &&
               Objects.equals(routeKey, that.routeKey) &&
               Objects.equals(idempotencyKey, that.idempotencyKey);
    }

    @Override
    public int hashCode() {
        return Objects.hash(actorId, routeKey, idempotencyKey);
    }
}
