package com.unichat.core.auth.service;

import java.time.Clock;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import com.unichat.core.auth.api.LoginRequest;
import com.unichat.core.testing.AuthPersistenceFixture;
import com.unichat.core.testing.PostgresFixture;
import static org.junit.jupiter.api.Assertions.*;

/** PostgreSQL race/commit evidence, explicitly failing when Docker is unavailable. */
@Testcontainers
class AuthPostgresIT {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4");
    static JdbcTemplate database;
    static AuthPersistenceFixture fixture;
    @BeforeAll static void initialize() {
        var source=PostgresFixture.migrate(POSTGRES); database=new JdbcTemplate(source);
        fixture=new AuthPersistenceFixture(source,Clock.systemUTC());
    }
    @AfterAll static void close() { if (fixture != null) fixture.close(); }
    @Test void shouldPersistFiveLoginFailuresAndAuditAfterDenial() {
        UUID user=seedUser(); String email=user+"@example.com";
        for (int attempt=0; attempt<5; attempt++) assertNull(fixture.transaction.execute(status -> fixture.login.authenticate(new LoginRequest(email,"incorrect"))).tokens());
        assertEquals(5,database.queryForObject("SELECT failed_login_count FROM users WHERE id=?",Integer.class,user));
        assertEquals("ACTIVE",database.queryForObject("SELECT status FROM users WHERE id=?",String.class,user));
        assertTrue(Boolean.TRUE.equals(database.queryForObject("SELECT locked_until>now() FROM users WHERE id=?",Boolean.class,user)));
        assertEquals(5,database.queryForObject("SELECT count(*) FROM audit_events WHERE actor_id=? AND action='AUTH_LOGIN_FAILURE'",Integer.class,user));
    }
    @Test void shouldRotateOnceAndCommitReuseRevocationAcrossTwoTransactions() throws Exception {
        UUID user=seedUser(),family=UUID.randomUUID(); String raw=TokenHash.generate();
        database.update("INSERT INTO refresh_families(id,user_id,expires_at) VALUES(?,?,now()+interval '7 days')",family,user);
        database.update("INSERT INTO refresh_tokens(id,user_id,family_id,token_hash,expires_at) VALUES(?,?,?,?,now()+interval '7 days')",UUID.randomUUID(),user,family,TokenHash.digest(raw));
        CyclicBarrier barrier=new CyclicBarrier(2);
        Callable<RefreshTransactions.Rotation> rotate=() -> { barrier.await(5,java.util.concurrent.TimeUnit.SECONDS); return fixture.transaction.execute(status -> fixture.refresh.rotate(raw)); };
        var executor=Executors.newFixedThreadPool(2);
        try {
            var results=executor.invokeAll(List.of(rotate,rotate),15,java.util.concurrent.TimeUnit.SECONDS);
            assertEquals(1,results.stream().filter(result -> accepted(result)).count());
        } finally { executor.shutdownNow(); }
        assertEquals(2,database.queryForObject("SELECT count(*) FROM refresh_tokens WHERE family_id=?",Integer.class,family));
        assertEquals(2,database.queryForObject("SELECT count(*) FROM refresh_tokens WHERE family_id=? AND revoked_at IS NOT NULL",Integer.class,family));
        assertFalse(Boolean.TRUE.equals(fixture.transaction.execute(status -> fixture.sessions.isActive(user,family,0))));
    }
    @Test void shouldRollbackLoginCountersWhenAuditPersistenceFails() {
        UUID user=seedUser();
        database.execute("CREATE FUNCTION reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit failure'; END $$");
        database.execute("CREATE TRIGGER reject_test_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_test_audit()");
        try {
            assertThrows(RuntimeException.class,() -> fixture.transaction.execute(status -> fixture.login.authenticate(new LoginRequest(user+"@example.com","incorrect"))));
            assertEquals(0,database.queryForObject("SELECT failed_login_count FROM users WHERE id=?",Integer.class,user));
        } finally { database.execute("DROP TRIGGER reject_test_audit ON audit_events"); database.execute("DROP FUNCTION reject_test_audit()"); }
    }
    private static boolean accepted(java.util.concurrent.Future<RefreshTransactions.Rotation> result) {
        try { return result.get().accepted(); } catch (Exception error) { throw new AssertionError(error); }
    }
    private UUID seedUser() {
        UUID user=UUID.randomUUID();
        database.update("INSERT INTO users(id,email,password_hash,system_role,status,display_name) VALUES(?,?,'unused-hash','USER','ACTIVE','Người dùng')",user,user+"@example.com");
        return user;
    }
}
