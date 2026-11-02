package com.unichat.core.admin.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ProviderMetricsServiceTest {
    @Test
    void shouldPreservePrimaryAndFallbackRegistryMetadata() {
        Instant now = Instant.parse("2026-10-28T00:00:00Z");
        ProviderMetricsService service = new ProviderMetricsService(
                new EmptyMetricsRepository(now), Clock.fixed(now, ZoneOffset.UTC), 45);
        Map<String, Object> registry = Map.of(
                "activeProvider", "gemini", "activeModel", "gemini-3.5-flash",
                "primaryProvider", "gemini", "fallbackProvider", "hive",
                "fallbackModel", "deepseek-ai/deepseek-v4.1-flash");

        Map<String, Object> metrics = service.getMetrics(7, null, null, registry);

        assertEquals("gemini", metrics.get("primaryProvider"));
        assertEquals("hive", metrics.get("fallbackProvider"));
        assertEquals("deepseek-ai/deepseek-v4.1-flash", metrics.get("fallbackModel"));
    }

    private static final class EmptyMetricsRepository extends ProviderMetricsRepository {
        private final Instant collectedFrom;

        private EmptyMetricsRepository(Instant now) {
            super(null);
            collectedFrom = now.minusSeconds(3600);
        }

        @Override
        public List<Map<String, Object>> daily(
                Instant start, Instant end, String keyId, String model) {
            return List.of();
        }

        @Override
        public Map<String, Object> purposes(
                Instant start, Instant end, String keyId, String model) {
            return Map.of();
        }

        @Override
        public Instant collectedFrom(String stream) {
            return collectedFrom;
        }

        @Override
        public List<Map<String, Object>> historicalKeys() {
            return List.of();
        }
    }
}
