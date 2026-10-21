package com.unichat.core.workchat.domain;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import java.util.function.Consumer;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.tool.schema.spi.SchemaManagementException;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Proves the additive repair against isolated legacy schemas and the real Hibernate entity. */
@Testcontainers
class DirectMessageMigrationPostgresIT {
    private static final String MIGRATION_RESOURCE = "db/migration/V38__restore_direct_messages_read_at.sql";
    private static final Instant CREATED_AT = Instant.parse("2026-10-10T10:00:00Z");
    private static final Instant READ_AT = Instant.parse("2026-10-10T10:01:00Z");
    private static final String MESSAGE_BODY = "Tin nhắn tiếng Việt còn nguyên nội dung";

    @Container
    final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.4");

    @Test
    void shouldRepairBaseline37SchemaWithoutChangingExistingMessages() {
        DataSource source = legacySchema();
        JdbcTemplate database = new JdbcTemplate(source);
        UUID messageId = insertMessage(database);
        Map<String, Object> originalMessage = messageSnapshot(database, messageId);
        Flyway flyway = baseline37(source);

        assertEquals(1, flyway.migrate().migrationsExecuted);

        assertReadAtContract(database);
        assertEquals(originalMessage, messageSnapshot(database, messageId));
        assertNull(database.queryForObject("SELECT read_at FROM direct_messages WHERE id=?", Object.class, messageId));
        assertEquals("38", flyway.info().current().getVersion().getVersion());
        assertEquals(0, flyway.migrate().migrationsExecuted);
    }

    @Test
    void shouldPreserveExistingReadReceiptsWhenRepairRuns() throws SQLException {
        DataSource source = legacySchema();
        JdbcTemplate database = new JdbcTemplate(source);
        database.execute("ALTER TABLE direct_messages ADD COLUMN read_at TIMESTAMPTZ");
        UUID messageId = insertMessage(database);
        database.update("UPDATE direct_messages SET read_at=? WHERE id=?", utc(READ_AT), messageId);
        Map<String, Object> originalMessage = database.queryForMap("SELECT * FROM direct_messages WHERE id=?", messageId);
        Flyway flyway = baseline37(source);

        flyway.migrate();
        executeRepair(source);

        assertReadAtContract(database);
        assertEquals(originalMessage, database.queryForMap("SELECT * FROM direct_messages WHERE id=?", messageId));
        assertEquals(READ_AT, readReceipt(database, messageId));
    }

    @Test
    void shouldApplyActualRepairSqlTwiceWithoutChangingRows() throws SQLException {
        DataSource source = legacySchema();
        JdbcTemplate database = new JdbcTemplate(source);
        UUID messageId = insertMessage(database);
        Map<String, Object> originalMessage = messageSnapshot(database, messageId);

        executeRepair(source);
        executeRepair(source);

        assertReadAtContract(database);
        assertEquals(originalMessage, messageSnapshot(database, messageId));
        assertEquals(1L, database.queryForObject("SELECT count(*) FROM direct_messages", Long.class));
        assertNull(database.queryForObject("SELECT read_at FROM direct_messages WHERE id=?", Object.class, messageId));
    }

    @Test
    void shouldValidateAndPersistRealEntityAfterRepairingMissingReadAt() {
        DataSource source = legacySchema();
        JdbcTemplate database = new JdbcTemplate(source);
        UUID messageId = insertMessage(database);
        SchemaManagementException missingColumn = assertThrows(SchemaManagementException.class,
                () -> withValidatedFactory(source, sessionFactory -> { }));
        assertTrue(missingColumn.getMessage().contains("read_at"));

        baseline37(source).migrate();

        withValidatedFactory(source, sessionFactory -> verifyEntityRoundTrip(sessionFactory, messageId));
        assertEquals(READ_AT, readReceipt(database, messageId));
        assertEquals(2L, database.queryForObject("SELECT count(*) FROM direct_messages", Long.class));
    }

    @Test
    void shouldKeepCompleteFreshMigrationChainCompatibleWithEntity() {
        DataSource source = migrateFreshSchema();
        JdbcTemplate database = new JdbcTemplate(source);

        withValidatedFactory(source, sessionFactory -> assertTrue(sessionFactory.isOpen()));

        assertReadAtContract(database);
        assertEquals(1L, database.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE version='38' AND success", Long.class));
    }

    @Test
    void shouldRejectIncompatibleExistingReadAtTypeWithoutRewritingIt() {
        DataSource source = legacySchema();
        JdbcTemplate database = new JdbcTemplate(source);
        database.execute("ALTER TABLE direct_messages ADD COLUMN read_at TEXT");
        UUID messageId = insertMessage(database);
        database.update("UPDATE direct_messages SET read_at=? WHERE id=?", "legacy receipt", messageId);

        baseline37(source).migrate();

        SchemaManagementException incompatibleColumn = assertThrows(SchemaManagementException.class,
                () -> withValidatedFactory(source, sessionFactory -> { }));
        assertTrue(incompatibleColumn.getMessage().contains("read_at"));
        assertEquals("text", readAtMetadata(database).get("udt_name"));
        assertEquals("legacy receipt", database.queryForObject("SELECT read_at FROM direct_messages WHERE id=?", String.class, messageId));
    }

    private DataSource legacySchema() {
        DataSource source = containerSource();
        new JdbcTemplate(source).execute("""
                CREATE TABLE public.direct_messages (
                    id UUID PRIMARY KEY,
                    conversation_id UUID NOT NULL,
                    sender_id UUID NOT NULL,
                    body TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """);
        return source;
    }

    private DataSource migrateFreshSchema() {
        DataSource source = containerSource();
        JdbcTemplate database = new JdbcTemplate(source);
        database.execute("CREATE ROLE anon NOLOGIN");
        database.execute("CREATE ROLE authenticated NOLOGIN");
        database.execute("CREATE ROLE service_role NOLOGIN");
        Flyway flyway = Flyway.configure().dataSource(source).locations("classpath:db/migration")
                .baselineVersion("0").load();
        flyway.baseline();
        // V23 must skip history: Flyway's separate history connection holds a conflicting table lock.
        database.execute("ALTER TABLE public.flyway_schema_history ENABLE ROW LEVEL SECURITY");
        flyway.migrate();
        return source;
    }

    private DataSource containerSource() {
        return new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
    }

    private Flyway baseline37(DataSource source) {
        Flyway flyway = Flyway.configure().dataSource(source).locations("classpath:db/migration")
                .baselineVersion("37").load();
        flyway.baseline();
        return flyway;
    }

    private UUID insertMessage(JdbcTemplate database) {
        UUID messageId = UUID.randomUUID();
        database.update("INSERT INTO direct_messages(id,conversation_id,sender_id,body,created_at) VALUES(?,?,?,?,?)",
                messageId, UUID.randomUUID(), UUID.randomUUID(), MESSAGE_BODY, utc(CREATED_AT));
        return messageId;
    }

    private Map<String, Object> messageSnapshot(JdbcTemplate database, UUID messageId) {
        return database.queryForMap("SELECT id,conversation_id,sender_id,body,created_at FROM direct_messages WHERE id=?", messageId);
    }

    private Map<String, Object> readAtMetadata(JdbcTemplate database) {
        return database.queryForMap("""
                SELECT data_type,udt_name,is_nullable,column_default
                FROM information_schema.columns
                WHERE table_schema='public' AND table_name='direct_messages' AND column_name='read_at'
                """);
    }

    private void assertReadAtContract(JdbcTemplate database) {
        Map<String, Object> column = readAtMetadata(database);
        assertEquals("timestamp with time zone", column.get("data_type"));
        assertEquals("timestamptz", column.get("udt_name"));
        assertEquals("YES", column.get("is_nullable"));
        assertNull(column.get("column_default"));
    }

    private void executeRepair(DataSource source) throws SQLException {
        try (Connection connection = source.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource(MIGRATION_RESOURCE));
        }
    }

    private void withValidatedFactory(DataSource source, Consumer<SessionFactory> assertion) {
        StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.datasource", source)
                .applySetting("hibernate.hbm2ddl.auto", "validate")
                .build();
        try (SessionFactory sessionFactory = new MetadataSources(registry)
                .addAnnotatedClass(DirectMessage.class).buildMetadata().buildSessionFactory()) {
            assertion.accept(sessionFactory);
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private void verifyEntityRoundTrip(SessionFactory sessionFactory, UUID messageId) {
        UUID newMessageId = UUID.randomUUID();
        try (Session session = sessionFactory.openSession()) {
            session.beginTransaction();
            DirectMessage existingMessage = session.find(DirectMessage.class, messageId);
            assertNotNull(existingMessage);
            assertEquals(MESSAGE_BODY, existingMessage.getBody());
            assertEquals(CREATED_AT, existingMessage.getCreatedAt());
            assertNull(existingMessage.getReadAt());
            existingMessage.markRead(READ_AT);
            session.persist(new DirectMessage(newMessageId, existingMessage.getConversationId(),
                    existingMessage.getSenderId(), "Tin nhắn mới sau khôi phục", CREATED_AT));
            session.getTransaction().commit();
        }
        try (Session session = sessionFactory.openSession()) {
            assertEquals(READ_AT, session.find(DirectMessage.class, messageId).getReadAt());
            DirectMessage newMessage = session.find(DirectMessage.class, newMessageId);
            assertEquals("Tin nhắn mới sau khôi phục", newMessage.getBody());
            assertNull(newMessage.getReadAt());
        }
    }

    private Instant readReceipt(JdbcTemplate database, UUID messageId) {
        return database.queryForObject("SELECT read_at FROM direct_messages WHERE id=?",
                (resultSet, rowNumber) -> resultSet.getObject("read_at", OffsetDateTime.class).toInstant(), messageId);
    }

    private OffsetDateTime utc(Instant timestamp) {
        return timestamp.atOffset(ZoneOffset.UTC);
    }
}
