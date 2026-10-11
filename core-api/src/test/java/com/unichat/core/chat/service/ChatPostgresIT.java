package com.unichat.core.chat.service;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.domain.ChatOperationRepository;
import com.unichat.core.shared.ratelimit.RateLimitService;
import com.unichat.core.testing.PostgresFixture;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Exercises operation SQL, locking, source-safe replay and transaction faults on disposable PostgreSQL. */
@Testcontainers
class ChatPostgresIT {
    @Container static final PostgreSQLContainer POSTGRES=new PostgreSQLContainer("postgres:18.4");
    static JdbcTemplate database;
    static DataSourceTransactionManager manager;
    ChatActor actor;
    UUID workspace;
    ChatSourceSnapshot sources;
    ChatOperationService service;
    ChatOperationRepository operations;
    ChatAccessService access;
    AuditService audit;
    @BeforeAll static void initialize() {
        var source=PostgresFixture.migrate(POSTGRES); database=new JdbcTemplate(source); manager=new DataSourceTransactionManager(source);
    }
    @BeforeEach void arrange() {
        actor=new ChatActor(UUID.randomUUID(),UUID.randomUUID(),0); workspace=UUID.randomUUID();
        database.update("INSERT INTO users(id,email,password_hash,system_role,status,display_name) VALUES(?,?,'unused','USER','ACTIVE','Người dùng')",actor.userId(),actor.userId()+"@example.com");
        database.update("INSERT INTO workspaces(id,owner_id,name,visibility,cloud_allowed) VALUES(?,?,'Nguồn fixture','PRIVATE',true)",workspace,actor.userId());
        sources=new ChatSourceSnapshot(workspace,0,0,true,"a".repeat(64),List.of());
        access=mock(ChatAccessService.class); audit=mock(AuditService.class);
        when(access.read(actor,workspace)).thenReturn(sources);
        var json=new ChatJson(new ObjectMapper()); var conversations=new ChatConversationStore(database);
        operations=new ChatOperationRepository(database,json);
        service=new ChatOperationService(operations,conversations,new ChatMessageStore(database,json,conversations),access,json,
                mock(RateLimitService.class),audit,Clock.systemUTC(),manager);
    }
    @Test void shouldReserveOneConversationAndTurnAcrossConcurrentSameKeyRetries() throws Exception {
        UUID key=UUID.randomUUID(); CyclicBarrier barrier=new CyclicBarrier(2);
        Callable<ChatOperationService.Reservation> reserve=() -> { barrier.await(5,java.util.concurrent.TimeUnit.SECONDS); return service.reserve(actor,workspace,question(null),key,"request"); };
        var executor=Executors.newFixedThreadPool(2);
        try {
            var results=executor.invokeAll(List.of(reserve,reserve),15,java.util.concurrent.TimeUnit.SECONDS);
            assertEquals(results.get(0).get().operation().id(),results.get(1).get().operation().id());
        } finally { executor.shutdownNow(); }
        assertEquals(1,count("SELECT count(*) FROM conversations WHERE user_id=?",actor.userId()));
        assertEquals(1,count("SELECT count(*) FROM chat_operations WHERE actor_id=?",actor.userId()));
        assertEquals(1,count("SELECT count(*) FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id=?)",actor.userId()));
    }
    @Test void shouldRollbackAllAssistantWritesWhenAuditFails() {
        var operation=reserve();
        doThrow(new IllegalStateException("audit unavailable")).when(audit).record(any(),eq("CHAT_COMPLETED"),anyString(),any(),anyString());
        assertThrows(IllegalStateException.class,() -> service.complete(operation,result(operation),"fixture",null,0));
        assertEquals(1,count("SELECT count(*) FROM messages WHERE conversation_id=?",operation.conversationId()));
        assertEquals("RUNNING",operations.findById(operation.id()).orElseThrow().state());
        assertNull(operations.findById(operation.id()).orElseThrow().resultMessageId());
    }
    @Test void shouldKeepCancelTerminalAndNeverResurrectItsAnswer() {
        var operation=reserve();
        service.cancel(actor,workspace,operation.id());
        var completed=service.complete(operation,result(operation),"fixture",null,0);
        assertEquals("CANCELLED",completed.state());
        assertEquals(1,count("SELECT count(*) FROM messages WHERE conversation_id=?",operation.conversationId()));
        verify(audit,never()).record(any(),eq("CHAT_COMPLETED"),anyString(),any(),anyString());
    }
    @Test void shouldHideCanonicalResultWhenSourceFingerprintChanges() {
        var operation=reserve(); service.complete(operation,result(operation),"fixture",null,0);
        when(access.read(actor,workspace)).thenReturn(new ChatSourceSnapshot(workspace,1,1,true,"b".repeat(64),List.of()));
        var replay=service.status(actor,workspace,operation.id()).result();
        assertEquals("REFUSE",replay.decision()); assertEquals("SOURCE_UNAVAILABLE",replay.refusalCode());
        assertFalse(replay.answer().contains("Nội dung fixture")); assertTrue(replay.citations().isEmpty());
    }
    @Test void shouldRejectSecondKeyInBusyConversationAndReleaseExpiredPermits() {
        var operation=reserve();
        assertThrows(ChatOperationError.class,() -> service.reserve(actor,workspace,question(operation.conversationId()),UUID.randomUUID(),"different"));
        database.update("UPDATE chat_operations SET lease_until=now()-interval '1 second' WHERE id=?",operation.id());
        service.cleanupLeases();
        assertEquals("FAILED",operations.findById(operation.id()).orElseThrow().state()); assertEquals(0,operations.running(actor.userId()));
    }
    private ChatOperation reserve() { return service.reserve(actor,workspace,question(null),UUID.randomUUID(),"request").operation(); }
    private AskQuestionRequest question(UUID conversation) { return new AskQuestionRequest("Câu hỏi fixture",conversation,false); }
    private long count(String query,UUID id) { return database.queryForObject(query,Long.class,id); }
    private QuestionResponse result(ChatOperation operation) {
        return new QuestionResponse(UUID.randomUUID(),operation.conversationId(),"REFUSE","Nội dung fixture","UNKNOWN","v1.0",List.of(),
                "INSUFFICIENT_EVIDENCE","request",null,null,null,operation.id(),"STRICT",List.of());
    }
}
