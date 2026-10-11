package com.unichat.core.admin.api;

import java.util.UUID;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.unichat.core.admin.domain.AuditEventRepository;

/** Paginated persisted security events, replacing demo rows. */
@RestController
@RequestMapping("/api/v1/admin/audit-events")
@PreAuthorize("hasAuthority('SCOPE_ADMIN')")
public class AdminAuditController {
    private final AuditEventRepository events;
    /** Reads the same store used by atomic account/chat mutations. */
    public AdminAuditController(AuditEventRepository events) { this.events = events; }
    /** Filters by action/outcome/actor and preserves deterministic newest-first ordering. */
    @GetMapping
    public Page<AuditEventResponse> list(@RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) @Pattern(regexp = "[A-Z_]{1,100}") String action,
            @RequestParam(required = false) @Pattern(regexp = "SUCCESS|FAILURE|DENIED") String outcome,
            @RequestParam(required = false) UUID actorId) {
        return events.search(action, outcome, actorId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt", "id"))).map(AuditEventResponse::from);
    }
}
