package com.unichat.core.chat.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import tools.jackson.databind.ObjectMapper;
import com.unichat.core.admin.service.AuditService;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.domain.ChatOperationRepository;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.shared.ratelimit.RateLimitService;

class ChatOperationServiceTest {
    private final ChatOperationRepository repository=mock(ChatOperationRepository.class);
    private final ChatConversationStore conversations=mock(ChatConversationStore.class);
    private final ChatMessageStore messages=mock(ChatMessageStore.class);
    private final ChatAccessService access=mock(ChatAccessService.class);
    private final AuditService audit=mock(AuditService.class);
    private final RateLimitService limits=mock(RateLimitService.class);
    private final PlatformTransactionManager transactions=mock(PlatformTransactionManager.class);
    private final ChatJson json=new ChatJson(new ObjectMapper());
    private final AskQuestionRequest request=new AskQuestionRequest("Câu hỏi tiếng Việt",null,false);
    private ChatOperationService service;
    @BeforeEach void setUp() {
        when(transactions.getTransaction(any())).thenAnswer(invocation -> new SimpleTransactionStatus());
        when(repository.expire(any(),any())).thenReturn(List.of());
        when(access.read(ChatFixture.ACTOR,ChatFixture.WORKSPACE)).thenReturn(ChatFixture.sources(true));
        service=new ChatOperationService(repository,conversations,messages,access,json,limits,audit,ChatFixture.CLOCK,transactions);
    }
    private ChatOperation operation(String state) {
        var base=ChatFixture.operation(true);
        return new ChatOperation(base.id(),base.actor(),base.key(),ChatBinding.from(ChatFixture.WORKSPACE,request).hash(json),
                base.workspaceId(),null,base.conversationId(),base.userMessageId(),null,base.question(),base.expanded(),base.requestId(),
                state,base.sources(),base.errorCode(),base.deadlineAt(),base.leaseUntil(),base.expiresAt());
    }
    @Test void shouldKeepOriginalNullConversationBindingOnRetry() {
        var operation=operation("RUNNING");
        when(repository.findByKey(ChatFixture.ACTOR.userId(),operation.key())).thenReturn(Optional.of(operation));
        var retry=service.reserve(ChatFixture.ACTOR,ChatFixture.WORKSPACE,request,operation.key(),"request-new");
        assertFalse(retry.created());assertEquals(operation.conversationId(),retry.operation().conversationId());
        verifyNoInteractions(limits,messages);verify(repository,never()).insert(any(),any());
    }
    @Test void shouldRejectRetryThatSubstitutesGeneratedConversationIntoBinding() {
        var operation=operation("RUNNING");
        when(repository.findByKey(ChatFixture.ACTOR.userId(),operation.key())).thenReturn(Optional.of(operation));
        var changed=new AskQuestionRequest(request.question(),operation.conversationId(),false);
        var error=assertThrows(ChatOperationError.class,() -> service.reserve(ChatFixture.ACTOR,ChatFixture.WORKSPACE,changed,operation.key(),"request-test"));
        assertEquals("IDEMPOTENCY_CONFLICT",error.getCode());verifyNoInteractions(limits,messages);
    }
    @Test void shouldRejectDifferentKeyWhenConversationBusyBeforeMessageCreation() {
        var id=UUID.randomUUID();var request=new AskQuestionRequest("Câu hỏi thứ hai",id,false);
        when(conversations.reserve(any(),any(),any())).thenReturn(id);when(repository.busy(id)).thenReturn(true);
        var error=assertThrows(ChatOperationError.class,() -> service.reserve(ChatFixture.ACTOR,ChatFixture.WORKSPACE,request,UUID.randomUUID(),"request-test"));
        assertEquals("CONVERSATION_BUSY",error.getCode());verifyNoInteractions(limits,messages);
    }
    @Test void shouldRejectSourceRevocationAtModelCheckpoint() {
        var operation=operation("RUNNING");when(repository.findById(operation.id())).thenReturn(Optional.of(operation));
        when(access.read(ChatFixture.ACTOR,ChatFixture.WORKSPACE)).thenReturn(ChatFixture.sources(false));
        assertEquals("SOURCE_UNAVAILABLE",assertThrows(ChatOperationError.class,() -> service.checkpoint(operation.id())).getCode());
        verify(repository,never()).heartbeat(any(),any());
    }
    @Test void shouldPreserveCancellationWhenCompletionArrivesLater() {
        var operation=operation("CANCELLED");when(repository.lock(operation.id())).thenReturn(operation);
        when(repository.findById(operation.id())).thenReturn(Optional.of(operation));
        var result=new ChatResultMapper(new ObjectMapper()).refusal(operation,UUID.randomUUID(),"NO_EVIDENCE","Không đủ bằng chứng.");
        assertEquals("CANCELLED",service.complete(operation,result,null,null,0).state());
        verifyNoInteractions(messages);verify(audit,never()).record(any(),eq("CHAT_COMPLETED"),any(),any(),any());
    }
    @Test void shouldRollbackFinalMutationWhenAuditFails() {
        var operation=operation("RUNNING");when(repository.lock(operation.id())).thenReturn(operation);
        doThrow(new IllegalStateException("audit fault")).when(audit).record(any(),eq("CHAT_COMPLETED"),any(),any(),any());
        var result=new ChatResultMapper(new ObjectMapper()).refusal(operation,UUID.randomUUID(),"NO_EVIDENCE","Không đủ bằng chứng.");
        assertThrows(IllegalStateException.class,() -> service.complete(operation,result,null,null,0));
        verify(transactions).rollback(any());verify(transactions,never()).commit(any());
    }
    @Test void shouldReturn404ForWrongOwnerOrWorkspace() {
        var operation=operation("RUNNING");when(repository.findById(operation.id())).thenReturn(Optional.of(operation));
        assertThrows(NotFoundError.class,() -> service.status(new ChatActor(UUID.randomUUID(),UUID.randomUUID(),2),ChatFixture.WORKSPACE,operation.id()));
        assertThrows(NotFoundError.class,() -> service.status(ChatFixture.ACTOR,UUID.randomUUID(),operation.id()));
    }
}
