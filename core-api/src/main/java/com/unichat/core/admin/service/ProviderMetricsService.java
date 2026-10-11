package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Durable dashboard measurements; AI file telemetry is never reported as complete history. */
@Service
public class ProviderMetricsService {
    private final ProviderMetricsRepository repository;
    private final Clock clock;
    private final int retentionDays;
    /** Keeps reporting coverage aligned with environment-configured cleanup. */
    public ProviderMetricsService(ProviderMetricsRepository repository, Clock clock,
            @Value("${METRICS_RETENTION_DAYS:45}") int retentionDays) {
        if (retentionDays < 1) throw new IllegalArgumentException("Metrics retention must be positive");
        this.repository = repository; this.clock = clock; this.retentionDays = retentionDays;
    }
    /** Returns measured chart samples with independently labeled registry availability. */
    @Transactional(readOnly = true)
    public Map<String, Object> getMetrics(int days, String keyId, String model, Map<String, Object> registry) {
        Instant end = Instant.now(clock);
        Instant start = end.atZone(ZoneOffset.UTC).toLocalDate().minusDays(days - 1L).atStartOfDay().toInstant(ZoneOffset.UTC);
        List<Map<String, Object>> rows = repository.daily(start, end, keyId, model);
        List<String> models = rows.stream().map(row -> String.valueOf(row.get("model"))).distinct().sorted().toList();
        long samples = ProviderMetricCharts.count(rows, "requests"), pending = ProviderMetricCharts.count(rows, "pending");
        Map<String, Object> result = coverage(start, end, samples, pending);
        result.put("timeRangeDays", days); result.put("source", "CORE_POSTGRESQL");
        result.put("keys", registry.getOrDefault("keys", List.of())); result.put("models", models);
        result.put("configuredModels", registry.getOrDefault("models", List.of()));
        result.put("registryStatus", registry.getOrDefault("status", "AVAILABLE"));
        result.put("tier", registry.getOrDefault("tier", "UNKNOWN"));
        result.put("summary", summary(rows, samples));
        result.put("purposes", repository.purposes(start, end, keyId, model));
        result.putAll(ProviderMetricCharts.build(rows, models, start.atZone(ZoneOffset.UTC).toLocalDate(), days));
        return result;
    }
    private Map<String, Object> coverage(Instant start, Instant end, long samples, long pending) {
        Instant collected = repository.collectedFrom("PROVIDER_ATTEMPTS"), cutoff = end.minus(retentionDays, ChronoUnit.DAYS);
        Instant retained = collected.isAfter(cutoff) ? collected : cutoff;
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("windowStart", start); result.put("windowEnd", end); result.put("retainedFrom", retained);
        result.put("updatedAt", end); result.put("sampleCount", samples); result.put("pendingSampleCount", pending);
        result.put("status", samples == 0 ? "NO_DATA" : "AVAILABLE");
        result.put("completeness", retained.isAfter(start) || pending > 0 ? "PARTIAL" : "COMPLETE");
        return result;
    }
    private Map<String, Object> summary(List<Map<String, Object>> rows, long samples) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRequests", samples); summary.put("totalErrors", ProviderMetricCharts.count(rows, "errors"));
        summary.put("overallSuccessRate", samples == 0 ? null : ProviderMetricCharts.count(rows, "successes") * 100.0 / samples);
        return summary;
    }
}
