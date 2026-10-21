package com.unichat.core.chat.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.common.error.NotFoundError;
import tools.jackson.databind.ObjectMapper;

class ChatOperationRunnerTest {
    private final ChatOperationService operations=mock(ChatOperationService.class);
    private final ChatMessageStore messages=mock(ChatMessageStore.class);
    private final ChatAiGateway gateway=mock(ChatAiGateway.class);
    private final ExecutorService executor=mock(ExecutorService.class);
    private final ScheduledExecutorService scheduler=mock(ScheduledExecutorService.class);
    private ChatOperationRunner runner;
    @BeforeEach void setUp() {
        doAnswer(invocation -> { ((Runnable)invocation.getArgument(0)).run();return null; }).when(executor).execute(any());
        when(scheduler.scheduleAtFixedRate(any(Runnable.class),anyLong(),anyLong(),any())).thenReturn(mock(ScheduledFuture.class));
        runner=new ChatOperationRunner(operations,messages,gateway,new ChatResultMapper(new ObjectMapper()),executor,scheduler);
    }
    @Test void shouldRefuseCloudDisabledWithoutGenerationOrCompaction() {
        var operation=ChatFixture.operation(false);
        when(operations.complete(eq(operation),any(),isNull(),isNull(),eq(0))).thenAnswer(invocation ->
                new ChatOperationResponse(operation.id(),"COMPLETED",operation.conversationId(),invocation.getArgument(1),null));
        var events=new ArrayList<String>();
        var result=runner.start(operation,true,(event,payload) -> events.add(event)).join();
        assertEquals("CLOUD_NOT_ALLOWED",result.result().refusalCode());
        verifyNoInteractions(gateway,messages,scheduler);
        assertEquals(List.of("metadata","pipeline-step","final","done"),events);
    }
    @Test void shouldNeverEmitFinalOrDoneWhenPersistenceFails() {
        var operation=ChatFixture.operation(false);
        when(operations.complete(eq(operation),any(),isNull(),isNull(),eq(0))).thenThrow(new IllegalStateException("DB fault"));
        when(operations.status(any(),any(),any())).thenReturn(new ChatOperationResponse(operation.id(),"FAILED",operation.conversationId(),null,"CHAT_FAILED"));
        var events=new ArrayList<String>();
        var result=runner.start(operation,true,(event,payload) -> events.add(event)).join();
        assertEquals("FAILED",result.state());assertFalse(events.contains("final"));assertFalse(events.contains("done"));
        verify(operations).fail(operation,"CHAT_FAILED");
    }
    @Test void shouldNotInvokeProviderWhenOwnershipCheckpointFails() {
        var operation=ChatFixture.operation(true);
        when(operations.checkpoint(operation.id())).thenThrow(new NotFoundError("gone"));
        when(operations.status(any(),any(),any())).thenReturn(new ChatOperationResponse(operation.id(),"FAILED",operation.conversationId(),null,"NOT_FOUND"));
        runner.start(operation,true,(event,payload) -> { }).join();
        verifyNoInteractions(gateway);
    }
    @Test void shouldFailOperationalProviderErrorWithoutAssistantSummaryFinalOrDone() {
        var operation=ChatFixture.operation(true);
        when(operations.checkpoint(operation.id())).thenReturn(operation);
        when(gateway.answer(eq(operation),anyMap(),eq(true),any())).thenThrow(new ChatOperationError(
                "PROVIDER_HTTP_429",org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"safe"));
        when(operations.status(any(),any(),any())).thenReturn(new ChatOperationResponse(
                operation.id(),"FAILED",operation.conversationId(),null,"PROVIDER_HTTP_429"));
        var events=new ArrayList<String>();
        var result=runner.start(operation,true,(event,payload) -> events.add(event)).join();
        assertEquals("FAILED",result.state()); assertTrue(events.contains("error"));
        assertFalse(events.contains("final")); assertFalse(events.contains("done"));
        verify(operations).fail(operation,"PROVIDER_HTTP_429");
        verify(operations,never()).complete(any(),any(),any(),any(),anyInt());
    }
}
