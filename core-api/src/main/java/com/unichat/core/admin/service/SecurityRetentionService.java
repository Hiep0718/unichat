package com.unichat.core.admin.service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies approved metadata retention without deleting events inside the retained window. */
@Service
@EnableScheduling
public class SecurityRetentionService {
    private final JdbcTemplate database;
    private final Clock clock;
    private final int metricsDays;
    private final int auditDays;
    /** Loads independently configurable metrics and audit retention windows. */
    public SecurityRetentionService(JdbcTemplate database, Clock clock,
            @Value("${METRICS_RETENTION_DAYS:45}") int metricsDays,
            @Value("${AUDIT_RETENTION_DAYS:180}") int auditDays) {
        if (metricsDays < 1 || auditDays < 1) throw new IllegalArgumentException("Retention must be positive");
        this.database = database; this.clock = clock; this.metricsDays = metricsDays; this.auditDays = auditDays;
    }
    /** The append-only trigger allows deletion only after the configured audit window. */
    @Scheduled(cron = "${SECURITY_RETENTION_CRON:0 0 3 * * *}", zone = "UTC")
    @Transactional
    public void removeExpiredMetadata() {
        Instant now = Instant.now(clock);
        database.queryForObject("SELECT set_config('unichat.audit_retention_seconds',?,true)",
                String.class, Long.toString(auditDays * 86400L));
        database.update("DELETE FROM provider_attempts WHERE started_at<?", Timestamp.from(now.minus(metricsDays, ChronoUnit.DAYS)));
        database.update("DELETE FROM audit_events WHERE occurred_at<?", Timestamp.from(now.minus(auditDays, ChronoUnit.DAYS)));
    }
}
