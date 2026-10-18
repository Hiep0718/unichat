package com.unichat.core.workchat.call;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.unichat.core.testing.PostgresFixture;

/**
 * Exercises V44 against a real PostgreSQL.
 *
 * <p>The CHECK constraints on {@code calls} are the point. They encode which
 * timestamps each status is allowed to carry, and a rule that is wrong does
 * not fail loudly — it lets a row through that produces a plausible but false
 * duration in somebody's call history, noticed much later if at all. The only
 * way to know they say what they mean is to make the database refuse the rows
 * they are supposed to refuse.
 */
@Testcontainers
class CallPostgresIT {

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4");

    static JdbcTemplate database;

    UUID conversation;
    UUID caller;
    UUID callee;

    @BeforeAll
    static void initialize() {
        database = new JdbcTemplate(PostgresFixture.migrate(POSTGRES));
    }

    @BeforeEach
    void arrange() {
        caller = insertUser();
        callee = insertUser();
        conversation = UUID.randomUUID();
        database.update("""
                INSERT INTO direct_conversations(id, kind, participant_low, participant_high, created_by)
                VALUES (?, 'DIRECT', ?, ?, ?)
                """, conversation, min(caller, callee), max(caller, callee), caller);
    }

    @Test
    void shouldStoreACallThatWasAnsweredAndThenEnded() {
        Instant start = Instant.parse("2026-10-18T09:00:00Z");
        insertCall("ENDED", start, start.plusSeconds(4), start.plusSeconds(64), "HUNG_UP");

        assertEquals(1, count("status = 'ENDED'"));
    }

    @Test
    void shouldRejectARingingCallThatAlreadyHasTimes() {
        Instant start = Instant.now();

        // Ringing has not happened yet and is not over; a row saying otherwise
        // means some transition wrote a timestamp without its status.
        assertThrows(DataIntegrityViolationException.class,
                () -> insertCall("RINGING", start, start.plusSeconds(1), null, null));
    }

    @Test
    void shouldRejectAnActiveCallThatWasNeverAnswered() {
        Instant start = Instant.now();

        assertThrows(DataIntegrityViolationException.class,
                () -> insertCall("ACTIVE", start, null, null, null));
    }

    @Test
    void shouldRejectAnEndedCallWithNoEndTime() {
        Instant start = Instant.now();

        // A duration computed from this would be wrong rather than absent.
        assertThrows(DataIntegrityViolationException.class,
                () -> insertCall("ENDED", start, start.plusSeconds(2), null, "HUNG_UP"));
    }

    @Test
    void shouldRejectAMissedCallThatSomehowHasAnAnswerTime() {
        Instant start = Instant.now();

        assertThrows(DataIntegrityViolationException.class,
                () -> insertCall("MISSED", start, start.plusSeconds(3), start.plusSeconds(5), "NO_ANSWER"));
    }

    @Test
    void shouldRejectAStatusOutsideTheStateMachine() {
        Instant start = Instant.now();

        assertThrows(DataIntegrityViolationException.class,
                () -> insertCall("ON_HOLD", start, null, start, "HUNG_UP"));
    }

    @Test
    void shouldAcceptBothMediaKindsAndRejectAnyOther() {
        Instant start = Instant.now();
        insertCall("MISSED", start, null, start, "OFFLINE", "AUDIO");
        insertCall("MISSED", start, null, start, "OFFLINE", "VIDEO");

        assertEquals(2, count("status = 'MISSED'"));
        assertThrows(DataIntegrityViolationException.class,
                () -> insertCall("MISSED", start, null, start, "OFFLINE", "SCREEN"));
    }

    @Test
    void shouldRemoveCallsWithTheConversationTheyBelongTo() {
        Instant start = Instant.now();
        insertCall("MISSED", start, null, start, "NO_ANSWER");

        database.update("DELETE FROM direct_conversations WHERE id = ?", conversation);

        // A call is part of its conversation, not a record that outlives it.
        assertEquals(0, count("1 = 1"));
    }

    @Test
    void shouldFindTheLiveCallOccupyingSomebodysLine() {
        Instant start = Instant.now();
        insertCall("RINGING", start, null, null, null);

        Integer live = database.queryForObject("""
                SELECT COUNT(*) FROM calls
                WHERE (caller_id = ? OR callee_id = ?) AND status IN ('RINGING', 'ACTIVE')
                """, Integer.class, callee, callee);

        // Being rung occupies the line as much as talking does.
        assertTrue(live != null && live == 1);
    }

    private void insertCall(String status, Instant started, Instant answered,
                            Instant ended, String reason) {
        insertCall(status, started, answered, ended, reason, "AUDIO");
    }

    private void insertCall(String status, Instant started, Instant answered,
                            Instant ended, String reason, String media) {
        database.update("""
                INSERT INTO calls(id, conversation_id, caller_id, callee_id, media, status,
                                  started_at, answered_at, ended_at, end_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(), conversation, caller, callee, media, status,
                java.sql.Timestamp.from(started),
                answered == null ? null : java.sql.Timestamp.from(answered),
                ended == null ? null : java.sql.Timestamp.from(ended),
                reason);
    }

    private int count(String where) {
        Integer total = database.queryForObject(
                "SELECT COUNT(*) FROM calls WHERE " + where, Integer.class);
        return total == null ? 0 : total;
    }

    private UUID insertUser() {
        UUID id = UUID.randomUUID();
        database.update("""
                INSERT INTO users(id, email, password_hash, system_role, status, display_name)
                VALUES (?, ?, 'unused', 'USER', 'ACTIVE', 'Người dùng')
                """, id, id + "@example.com");
        return id;
    }

    private static UUID min(UUID a, UUID b) {
        return a.compareTo(b) <= 0 ? a : b;
    }

    private static UUID max(UUID a, UUID b) {
        return a.compareTo(b) <= 0 ? b : a;
    }
}
