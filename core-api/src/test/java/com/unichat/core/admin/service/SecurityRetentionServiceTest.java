package com.unichat.core.admin.service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

class SecurityRetentionServiceTest {
    @Test void shouldDeleteOnlyFinishedOldAttemptsAndRetainPendingAttempts() {
        var database = mock(JdbcTemplate.class);
        var now = Instant.parse("2026-10-16T00:00:00Z");
        var retention = new SecurityRetentionService(database, Clock.fixed(now, ZoneOffset.UTC), 45, 180);

        retention.removeExpiredMetadata();

        verify(database).queryForObject("SELECT set_config('unichat.audit_retention_seconds',?,true)",
                String.class, Long.toString(180 * 86400L));
        verify(database).update("DELETE FROM provider_attempts WHERE started_at<? AND ended_at IS NOT NULL",
                Timestamp.from(now.minus(45, ChronoUnit.DAYS)));
        verify(database).update("DELETE FROM audit_events WHERE occurred_at<?",
                Timestamp.from(now.minus(180, ChronoUnit.DAYS)));
        verifyNoMoreInteractions(database);
    }
}
