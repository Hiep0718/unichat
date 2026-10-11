package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.domain.AuditEvent;
import com.unichat.core.admin.domain.AuditEventRepository;

/** Persists security decisions in the same transaction as the protected change. */
@Service
public class AuditService {
    private final AuditEventRepository repository;
    private final Clock clock;
    /** Requires durable persistence and the application clock. */
    public AuditService(AuditEventRepository repository, Clock clock) {
        this.repository = repository; this.clock = clock;
    }
    /** Writes metadata only; an unavailable audit store aborts the caller transaction. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actorId, String action, String targetType, UUID targetId, String outcome) {
        String requestId = MDC.get("requestId");
        repository.saveAndFlush(new AuditEvent(UUID.randomUUID(), Instant.now(clock),
                requestId == null ? "unknown" : requestId, actorId, action, targetType, targetId, outcome));
    }
}
