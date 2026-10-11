package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.domain.AuditEventRepository;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;

/** System metrics from durable logical operations and auth events, without private content. */
@Service
public class AdminMetricsService {
    private final UserRepository users;
    private final AuditEventRepository audit;
    private final JdbcTemplate database;
    private final Clock clock;
    private final int retentionDays;
    /** Uses server timestamps rather than provider-estimated counters. */
    public AdminMetricsService(UserRepository users, AuditEventRepository audit, JdbcTemplate database, Clock clock,
            @Value("${METRICS_RETENTION_DAYS:45}") int retentionDays) {
        if (retentionDays < 1) throw new IllegalArgumentException("Metrics retention must be positive");
        this.users = users; this.audit = audit; this.database = database; this.clock = clock;
        this.retentionDays = retentionDays;
    }
    /** Returns measured values and explicit missing/incomplete metadata. */
    @Transactional(readOnly = true)
    public Map<String, Object> getMetrics(int days) {
        Instant end = Instant.now(clock), start = end.minus(days, ChronoUnit.DAYS);
        Instant retained = retainedFrom(end);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("windowStart", start); result.put("windowEnd", end); result.put("retainedFrom", retained);
        result.put("completeness", retained != null && !retained.isAfter(start) ? "COMPLETE" : "PARTIAL");
        result.put("updatedAt", end); accountCounts(result); eventCounts(result, start);
        long samples = ((Number) result.get("loginSuccess")).longValue() + ((Number) result.get("loginFailure")).longValue()
                + ((Number) result.get("chatCompleted")).longValue() + ((Number) result.get("chatFailed")).longValue()
                + ((Number) result.get("chatCancelled")).longValue();
        result.put("sampleCount", samples); result.put("status", samples == 0 ? "NO_DATA" : "AVAILABLE");
        result.putAll(timings(start, end));
        return result;
    }
    private Instant retainedFrom(Instant end) {
        Instant collected = database.queryForObject("SELECT collected_from FROM security_telemetry_coverage WHERE stream=?",
                (row, index) -> row.getTimestamp(1).toInstant(), "SECURITY_AUDIT");
        Instant cutoff = end.minus(retentionDays, ChronoUnit.DAYS);
        return collected == null || collected.isBefore(cutoff) ? cutoff : collected;
    }
    private void accountCounts(Map<String, Object> result) {
        result.put("totalUsers", users.count()); result.put("activeUsers", users.countByStatus(UserStatus.ACTIVE));
        result.put("lockedUsers", users.countByStatus(UserStatus.LOCKED));
        result.put("adminUsers", users.countBySystemRole(SystemRole.ADMIN));
    }
    private void eventCounts(Map<String, Object> result, Instant start) {
        Map<String, String> actions = Map.of("loginSuccess", "AUTH_LOGIN_SUCCESS", "loginFailure", "AUTH_LOGIN_FAILURE",
                "chatCompleted", "CHAT_COMPLETED", "chatFailed", "CHAT_FAILED", "chatCancelled", "CHAT_CANCELLED",
                "answerCount", "CHAT_ANSWER", "refusalCount", "CHAT_REFUSE", "clarifyCount", "CHAT_CLARIFY");
        actions.forEach((field, action) -> result.put(field, audit.countByActionAndOccurredAtGreaterThanEqual(action, start)));
    }
    private Map<String, Object> timings(Instant start, Instant end) {
        var measured = database.queryForMap("SELECT "
                + "percentile_cont(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (terminal_at-created_at))*1000) "
                + "FILTER (WHERE state='COMPLETED') AS latency, "
                + "AVG(EXTRACT(EPOCH FROM (first_token_at-created_at))*1000) AS ttft, "
                + "COUNT(*) FILTER (WHERE state='COMPLETED') AS latency_samples, "
                + "COUNT(first_token_at) AS ttft_samples FROM chat_operations WHERE created_at>=? AND created_at<=?",
                java.sql.Timestamp.from(start), java.sql.Timestamp.from(end));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("p95LatencyMs", measured.get("latency")); result.put("ttftMs", measured.get("ttft"));
        result.put("latencySampleCount", measured.get("latency_samples")); result.put("ttftSampleCount", measured.get("ttft_samples"));
        return result;
    }
}
