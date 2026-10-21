package com.unichat.core.admin.service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Parameterized PostgreSQL aggregates over measured provider attempts only. */
@Repository
public class ProviderMetricsRepository {
    private final JdbcTemplate database;
    /** Receives the authoritative metadata database. */
    public ProviderMetricsRepository(JdbcTemplate database) { this.database = database; }
    /** Aggregates bounded daily/model samples without loading prompts or call contents. */
    public List<Map<String, Object>> daily(Instant start, Instant end, String keyId, String model) {
        return database.queryForList("SELECT (started_at AT TIME ZONE 'UTC')::date::text AS day, model, "
                + "COUNT(*) AS requests, COUNT(*) FILTER (WHERE outcome='SUCCESS') AS successes, "
                + "COUNT(*) FILTER (WHERE outcome='ERROR') AS errors, COUNT(*) FILTER (WHERE ended_at IS NULL) AS pending, "
                + "COUNT(*) FILTER (WHERE error_code='PROVIDER_HTTP_429') AS error429, "
                + "COUNT(*) FILTER (WHERE error_code='PROVIDER_HTTP_503') AS error503, "
                + "CASE WHEN COUNT(input_tokens)=COUNT(*) THEN SUM(input_tokens) END AS input_tokens, "
                + "CASE WHEN COUNT(output_tokens)=COUNT(*) THEN SUM(output_tokens) END AS output_tokens "
                + "FROM provider_attempts WHERE started_at>=? AND started_at<=? "
                + "AND (?::text IS NULL OR key_id=?) AND (?::text IS NULL OR model=?) "
                + "GROUP BY day,model ORDER BY day,model", Timestamp.from(start), Timestamp.from(end), keyId, keyId, model, model);
    }
    /** Separates physical calls by purpose from distinct logical chat operations. */
    public Map<String, Object> purposes(Instant start, Instant end, String keyId, String model) {
        return database.queryForMap("SELECT COUNT(DISTINCT operation_id) FILTER (WHERE purpose='CHAT') AS logical_chats, "
                + "COUNT(*) FILTER (WHERE purpose='CHAT') AS chat_attempts, "
                + "COUNT(*) FILTER (WHERE purpose='COMPACTION') AS compaction_attempts, "
                + "COUNT(*) FILTER (WHERE purpose='ADMIN_PROMPT') AS admin_prompt_attempts, "
                + "COUNT(*) FILTER (WHERE purpose='KEY_PROBE') AS key_probe_attempts "
                + "FROM provider_attempts WHERE started_at>=? AND started_at<=? "
                + "AND (?::text IS NULL OR key_id=?) AND (?::text IS NULL OR model=?)",
                Timestamp.from(start), Timestamp.from(end), keyId, keyId, model, model);
    }
    /** Collection start is tracked independently of the first observed event. */
    public Instant collectedFrom(String stream) {
        return database.queryForObject("SELECT collected_from FROM security_telemetry_coverage WHERE stream=?",
                (row, index) -> row.getTimestamp(1).toInstant(), stream);
    }
    /** Retains at most 100 observed key/provider identifiers in stable lexical order. */
    public List<Map<String, Object>> historicalKeys() {
        return database.queryForList("SELECT DISTINCT key_id AS \"keyId\",provider FROM provider_attempts "
                + "ORDER BY \"keyId\",provider LIMIT 100");
    }
}
