package com.unichat.core.admin.domain;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Append/read gateway for durable security events. */
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
    /** Filters metadata with bound parameters and bounded pagination. */
    @Query("SELECT a FROM AuditEvent a WHERE (:action IS NULL OR a.action = :action) "
            + "AND (:outcome IS NULL OR a.outcome = :outcome) AND (:actorId IS NULL OR a.actorId = :actorId)")
    Page<AuditEvent> search(@Param("action") String action, @Param("outcome") String outcome,
            @Param("actorId") UUID actorId, Pageable pageable);
    /** Counts measured events in a reporting window. */
    long countByActionAndOccurredAtGreaterThanEqual(String action, Instant from);
    /** Earliest retained evidence, or null if no sample exists. */
    @Query("SELECT MIN(a.occurredAt) FROM AuditEvent a")
    Instant earliestEvent();
}
