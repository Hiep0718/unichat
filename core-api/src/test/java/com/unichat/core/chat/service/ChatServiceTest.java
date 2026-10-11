package com.unichat.core.chat.service;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.common.error.UnauthenticatedError;

class ChatServiceTest {
    private final ChatOperationService operations=mock(ChatOperationService.class);
    private final ChatOperationRunner runner=mock(ChatOperationRunner.class);
    private final ChatService service=new ChatService(operations,runner);
    private final AskQuestionRequest request=new AskQuestionRequest("Câu hỏi tiếng Việt",null,false);
    @Test void shouldReplaySameKeyWithoutCallingProviderAgain() {
        var operation=ChatFixture.operation(true);
        var status=new ChatOperationResponse(operation.id(),"RUNNING",operation.conversationId(),null,null);
        when(operations.reserve(ChatFixture.ACTOR,ChatFixture.WORKSPACE,request,operation.key(),"request-test"))
                .thenReturn(new ChatOperationService.Reservation(operation,false));
        when(operations.status(ChatFixture.ACTOR,ChatFixture.WORKSPACE,operation.id())).thenReturn(status);
        assertSame(status,service.ask(ChatFixture.ACTOR,ChatFixture.WORKSPACE,request,operation.key(),"request-test"));
        verifyNoInteractions(runner);
    }
    @Test void shouldStartOnlyNewReservation() {
        var operation=ChatFixture.operation(true);
        var status=new ChatOperationResponse(operation.id(),"COMPLETED",operation.conversationId(),null,null);
        when(operations.reserve(any(),any(),any(),any(),any())).thenReturn(new ChatOperationService.Reservation(operation,true));
        when(runner.start(eq(operation),eq(false),any())).thenReturn(CompletableFuture.completedFuture(status));
        assertSame(status,service.ask(ChatFixture.ACTOR,ChatFixture.WORKSPACE,request,operation.key(),"request-test"));
        verify(runner,times(1)).start(eq(operation),eq(false),any());
    }
    @Test void shouldDenyLegacyInvocationWithoutAuthenticatedSession() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
        assertThrows(UnauthenticatedError.class,() -> service.askQuestion(ChatFixture.ACTOR.userId(),ChatFixture.WORKSPACE,request,UUID.randomUUID().toString()));
        verifyNoInteractions(operations,runner);
    }
}
