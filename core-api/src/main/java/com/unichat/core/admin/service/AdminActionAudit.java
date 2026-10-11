package com.unichat.core.admin.service;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Records admin provider checks outside the network-call transaction. */
@Service
public class AdminActionAudit {
    private final AuditService audit;
    /** Uses the same append-only metadata store as account administration. */
    public AdminActionAudit(AuditService audit) { this.audit = audit; }
    /** Both successful and unavailable outcomes remain observable. */
    @Transactional
    public void record(UUID actorId, String action, String status) {
        boolean success = "HEALTHY".equals(status) || "SUCCESS".equals(status);
        audit.record(actorId, action, "AI_STUDIO_KEY", null, success ? "SUCCESS" : "FAILURE");
    }
}
