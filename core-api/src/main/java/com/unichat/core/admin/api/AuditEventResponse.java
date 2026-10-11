package com.unichat.core.admin.api;

import java.time.Instant;
import java.util.UUID;
import com.unichat.core.admin.domain.AuditEvent;

/** Public metadata projection; no entity or raw sensitive data is serialized. */
public record AuditEventResponse(UUID id, Instant occurredAt, String requestId, UUID actorId,
        String action, String targetType, UUID targetId, String outcome) {
    /** Projects one append-only event. */
    public static AuditEventResponse from(AuditEvent event) {
        return new AuditEventResponse(event.getId(), event.getOccurredAt(), event.getRequestId(), event.getActorId(),
                event.getAction(), event.getTargetType(), event.getTargetId(), event.getOutcome());
    }
}
