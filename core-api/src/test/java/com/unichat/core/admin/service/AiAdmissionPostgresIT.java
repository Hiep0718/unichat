package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.SharedEntityManagerCreator;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import com.unichat.core.admin.api.AiAdmissionRequest;
import com.unichat.core.admin.api.ProviderAttemptRequest;
import com.unichat.core.admin.domain.ProviderAttemptRepository;
import com.unichat.core.chat.service.ChatOperationError;
import com.unichat.core.testing.PostgresFixture;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/** Real JPA/JDBC transactions prove atomic START admission and conservative draining. */
@Testcontainers
class AiAdmissionPostgresIT {
    @Container static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4");
    private static EntityManagerFactory entities;
    private static JdbcTemplate database;
    private static JpaTransactionManager manager;
    private static TransactionTemplate transaction;
    private AiAdmissionService admission;
    private ProviderAttemptService attempts;
    private UUID actorId;

    @BeforeAll static void initialize() {
        var source = PostgresFixture.migrate(POSTGRES); database = new JdbcTemplate(source);
        var factory = new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(source); factory.setPackagesToScan("com.unichat.core.admin.domain");
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter()); factory.afterPropertiesSet();
        entities = factory.getObject(); manager = new JpaTransactionManager(entities);
        manager.setDataSource(source); transaction = new TransactionTemplate(manager);
    }
    @AfterAll static void close() { if (entities != null) entities.close(); }
    @BeforeEach void arrange() {
        database.update("UPDATE ai_generation_control SET state='OPEN',version=0,updated_by=NULL WHERE id=1");
        database.update("DELETE FROM provider_attempts");
        actorId = UUID.randomUUID();
        database.update("INSERT INTO users(id,email,password_hash,system_role,status,display_name) "
                + "VALUES(?,?,'unused','ADMIN','ACTIVE','Quản trị viên')", actorId, actorId + "@example.com");
        admission = transactional(new AiAdmissionService(new AiAdmissionRepository(database), mock(AuditService.class)));
        var entityManager = SharedEntityManagerCreator.createSharedEntityManager(entities);
        var repository = new JpaRepositoryFactory(entityManager).getRepository(ProviderAttemptRepository.class);
        attempts = transactional(new ProviderAttemptService(entityManager, repository, Clock.systemUTC(), admission));
    }
    @Test void shouldReadStatusAndDiagnosticGateThroughRealLockingTransactions() {
        assertEquals("OPEN", admission.status().state()); admission.checkDiagnostic();
        admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L));
        assertThrows(AiMaintenanceError.class, admission::checkDiagnostic);
    }
    @Test void shouldReplayImmutableStartAndAcceptEndDuringDrain() {
        var start = request(UUID.randomUUID(), "START", "hive-primary"); attempts.record(start);
        admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L)); attempts.record(start);
        assertEquals(1, admission.status().pendingAttemptCount());
        assertThrows(com.unichat.core.common.error.ConflictError.class,
                () -> attempts.record(request(start.attemptId(), "START", "hive-secondary")));
        attempts.record(end(start)); attempts.record(end(start));
        assertEquals(0, admission.status().pendingAttemptCount());
        assertEquals("VERIFYING", admission.update(actorId, new AiAdmissionRequest("VERIFYING", 1L)).state());
    }
    @Test void shouldBlockNewDiagnosticWithoutInsertionAndAllowVerifyingDiagnostic() {
        admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L));
        assertThrows(AiMaintenanceError.class, () -> attempts.record(request(UUID.randomUUID(), "START", "hive-primary")));
        assertEquals(0, countAttempts());
        admission.update(actorId, new AiAdmissionRequest("VERIFYING", 1L));
        attempts.record(request(UUID.randomUUID(), "START", "hive-primary")); assertEquals(1, countAttempts());
    }
    @Test void shouldKeepUnknownPendingAttemptBlockingVerification() {
        attempts.record(request(UUID.randomUUID(), "START", "hive-primary"));
        var finished = request(UUID.randomUUID(), "START", "hive-secondary");
        attempts.record(finished); attempts.record(end(finished));
        database.update("UPDATE provider_attempts SET started_at=now()-interval '90 days'");
        transaction.executeWithoutResult(status ->
                new SecurityRetentionService(database, Clock.systemUTC(), 45, 180).removeExpiredMetadata());
        assertEquals(1, countAttempts());
        assertEquals(0L, database.queryForObject("SELECT count(*) FROM provider_attempts WHERE id=?",
                Long.class, finished.attemptId()));
        admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L));
        var conflict = assertThrows(ChatOperationError.class,
                () -> admission.update(actorId, new AiAdmissionRequest("VERIFYING", 1L)));
        assertEquals("ADMISSION_NOT_DRAINED", conflict.getCode());
        assertEquals(1, admission.status().pendingAttemptCount());
    }
    @Test void shouldWaitForAdmittedStartCommitBeforeDrainAndObservePendingCall() throws Exception {
        var inserted = new CountDownLatch(1); var release = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var start = executor.submit(() -> transaction.executeWithoutResult(status -> {
                attempts.record(request(UUID.randomUUID(), "START", "hive-primary")); inserted.countDown(); await(release);
            }));
            assertTrue(inserted.await(5, TimeUnit.SECONDS));
            var drain = executor.submit(() -> admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L)));
            awaitBlockedGate(); release.countDown(); start.get(10, TimeUnit.SECONDS);
            assertEquals(1, drain.get(10, TimeUnit.SECONDS).pendingAttemptCount());
            assertThrows(ChatOperationError.class, () -> admission.update(actorId, new AiAdmissionRequest("VERIFYING", 1L)));
        } finally { release.countDown(); executor.shutdownNow(); }
    }
    @Test void shouldRejectStartWaitingBehindCommittedDrainWithoutInsertion() throws Exception {
        var locked = new CountDownLatch(1); var release = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var drain = executor.submit(() -> transaction.executeWithoutResult(status -> {
                admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L)); locked.countDown(); await(release);
            }));
            assertTrue(locked.await(5, TimeUnit.SECONDS));
            var start = executor.submit(() -> assertThrows(AiMaintenanceError.class,
                    () -> attempts.record(request(UUID.randomUUID(), "START", "hive-primary"))));
            awaitBlockedGate(); release.countDown(); drain.get(10, TimeUnit.SECONDS); start.get(10, TimeUnit.SECONDS);
            assertEquals(0, countAttempts());
        } finally { release.countDown(); executor.shutdownNow(); }
    }
    @Test void shouldRejectStaleSameStateAndRetainVersionForFreshNoop() {
        admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L));
        assertThrows(ChatOperationError.class, () -> admission.update(actorId, new AiAdmissionRequest("DRAINING", 0L)));
        assertEquals(1, admission.update(actorId, new AiAdmissionRequest("DRAINING", 1L)).version());
    }
    private ProviderAttemptRequest request(UUID attemptId, String phase, String keyId) {
        return new ProviderAttemptRequest(attemptId, null, "KEY_PROBE", "hive", keyId,
                "deepseek-ai/deepseek-v4.1-flash", phase, null, Instant.now(), null, null, null, null);
    }
    private ProviderAttemptRequest end(ProviderAttemptRequest start) {
        return new ProviderAttemptRequest(start.attemptId(), null, start.purpose(), start.provider(), start.keyId(),
                start.model(), "END", "SUCCESS", start.occurredAt().plusMillis(1), 1L, null, null, null);
    }
    private long countAttempts() { return database.queryForObject("SELECT count(*) FROM provider_attempts", Long.class); }
    private void awaitBlockedGate() throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (System.nanoTime() < deadline) {
            long waiting = database.queryForObject("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type='Lock' "
                    + "AND query LIKE '%ai_generation_control%'", Long.class);
            if (waiting > 0) return;
            Thread.sleep(20);
        }
        fail("Expected a real gate lock waiter before releasing the transaction");
    }
    private static void await(CountDownLatch latch) {
        try { if (!latch.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Test latch timeout"); }
        catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new IllegalStateException(error); }
    }
    @SuppressWarnings("unchecked")
    private <Service> Service transactional(Service target) {
        var proxy = new ProxyFactory(target); proxy.setProxyTargetClass(true);
        var interceptor = new TransactionInterceptor(); interceptor.setTransactionManager(manager);
        interceptor.setTransactionAttributeSource(new AnnotationTransactionAttributeSource()); proxy.addAdvice(interceptor);
        return (Service) proxy.getProxy();
    }
}
