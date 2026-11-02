package com.unichat.core.admin.service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Proves V47 changes only the provider-attempt purpose constraint on disposable PostgreSQL. */
@Testcontainers
class ProviderAttemptPurposeMigrationPostgresIT {
    private static final Set<String> LEGACY_PURPOSES =
            Set.of("CHAT", "COMPACTION", "ADMIN_PROMPT", "KEY_PROBE");

    @Container
    final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.4");

    @Test
    void shouldPreserveLegacyPurposesAndAcceptQueryPlanAfterMigration() {
        JdbcTemplate database = legacyDatabase();
        LEGACY_PURPOSES.forEach(purpose -> insertAttempt(database, purpose));

        Flyway flyway = migrateV47(database.getDataSource());
        insertAttempt(database, "QUERY_PLAN");

        Set<String> persistedPurposes = new HashSet<>(
                database.queryForList("SELECT purpose FROM provider_attempts", String.class));
        assertEquals(Set.of("CHAT", "COMPACTION", "QUERY_PLAN", "ADMIN_PROMPT", "KEY_PROBE"),
                persistedPurposes);
        assertEquals("47", flyway.info().current().getVersion().getVersion());
    }

    @Test
    void shouldRejectUnknownPurposeAfterMigration() {
        JdbcTemplate database = legacyDatabase();
        migrateV47(database.getDataSource());

        assertThrows(DataIntegrityViolationException.class,
                () -> insertAttempt(database, "UNKNOWN_PURPOSE"));
    }

    private JdbcTemplate legacyDatabase() {
        JdbcTemplate database = new JdbcTemplate(containerSource());
        database.execute("""
                CREATE TABLE provider_attempts (
                    id UUID PRIMARY KEY,
                    operation_id UUID,
                    purpose VARCHAR(40) NOT NULL
                        CHECK (purpose IN ('CHAT','COMPACTION','ADMIN_PROMPT','KEY_PROBE')),
                    provider VARCHAR(40) NOT NULL,
                    key_id VARCHAR(100) NOT NULL,
                    model VARCHAR(100) NOT NULL,
                    started_at TIMESTAMPTZ NOT NULL
                )
                """);
        return database;
    }

    private DataSource containerSource() {
        return new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    private Flyway migrateV47(DataSource source) {
        Flyway flyway = Flyway.configure().dataSource(source).locations("classpath:db/migration")
                .baselineVersion("46").load();
        flyway.baseline();
        assertEquals(1, flyway.migrate().migrationsExecuted);
        return flyway;
    }

    private void insertAttempt(JdbcTemplate database, String purpose) {
        database.update("""
                INSERT INTO provider_attempts
                    (id, operation_id, purpose, provider, key_id, model, started_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), UUID.randomUUID(), purpose, "hive", "hive-primary",
                "deepseek-ai/deepseek-v4.1-flash", OffsetDateTime.now(ZoneOffset.UTC));
    }
}
