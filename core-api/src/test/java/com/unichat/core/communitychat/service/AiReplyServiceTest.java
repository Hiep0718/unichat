package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.chat.api.ChatOperationResponse;
import com.unichat.core.chat.api.CitationResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatOperationError;
import com.unichat.core.chat.service.ChatOperationRunner;
import com.unichat.core.chat.service.ChatOperationService;
import com.unichat.core.chat.service.ChatSourceSnapshot;
import com.unichat.core.communitychat.domain.AiMentionEvent;
import com.unichat.core.communitychat.domain.ReplyCitation;

/**
 * A mention is answered through the same authorized chat operation as the AI
 * assistant, and the thread always gets either the answer or the reason why
 * there is none.
 */
class AiReplyServiceTest {

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID triggerReplyId = UUID.randomUUID();
    private final UUID documentId = UUID.randomUUID();
    private final ChatActor asker = new ChatActor(UUID.randomUUID(), UUID.randomUUID(), 3L);

    private ChatOperationService operations;
    private ChatOperationRunner runner;
    private AiReplyWriter writer;
    private AiReplyService service;
    private ChatOperation operation;

    @BeforeEach
    void setUp() {
        operations = mock(ChatOperationService.class);
        runner = mock(ChatOperationRunner.class);
        writer = mock(AiReplyWriter.class);
        service = new AiReplyService(operations, runner, writer);
        operation = operation();
    }

    @Test
    void shouldAskAsTheCommenterWithTheCommentAsTheIdempotencyKey() {
        // Arrange
        reserved(true);
        finishedWith(completed(answer()));

        // Act
        service.onAiMention(mentionOf("@AI chỉ mục là gì và dùng khi nào?"));

        // Assert
        ArgumentCaptor<AskQuestionRequest> request = ArgumentCaptor.forClass(AskQuestionRequest.class);
        verify(operations).reserve(eq(asker), eq(workspaceId), request.capture(),
                eq(triggerReplyId), eq("ai-mention-" + triggerReplyId));
        assertEquals("chỉ mục là gì và dùng khi nào?", request.getValue().question());
    }

    @Test
    void shouldPostTheAnswerWithItsSourcesAndTheOperationAsTrace() {
        // Arrange
        reserved(true);
        finishedWith(completed(answer()));

        // Act
        service.onAiMention(mentionOf("@AI chỉ mục là gì và dùng khi nào?"));

        // Assert
        AiMentionAnswer posted = postedAnswer();
        assertEquals("Chỉ mục giúp truy vấn nhanh hơn [1].", posted.body());
        assertEquals(operation.id(), posted.traceId());
        ReplyCitation citation = posted.citations().get(0);
        assertEquals("1", citation.citationId());
        assertEquals(documentId.toString(), citation.documentId());
        assertEquals("giao-trinh-csdl.pdf", citation.fileName());
        assertEquals("trang 12", citation.locator());
    }

    @Test
    void shouldRestoreThePostTopicWhenTheQuestionIsTooShortToStandAlone() {
        // Act
        String question = AiReplyService.questionOf(mentionOf("@AI vì sao?"));

        // Assert
        assertEquals("Trong chủ đề \"Chỉ mục trong CSDL\", vì sao?", question);
    }

    @Test
    void shouldPassARefusalReasonThroughToTheThread() {
        // Arrange: the workspace forbids cloud AI, so the pipeline refuses.
        reserved(true);
        finishedWith(completed(refusal("Workspace chưa cho phép xử lý bằng AI.")));

        // Act
        service.onAiMention(mentionOf("@AI chỉ mục là gì và dùng khi nào?"));

        // Assert
        assertEquals("Workspace chưa cho phép xử lý bằng AI.", postedAnswer().body());
        assertTrue(postedAnswer().citations().isEmpty());
    }

    @Test
    void shouldTellTheReaderWhyTheOperationFailed() {
        // Arrange
        reserved(true);
        finishedWith(new ChatOperationResponse(operation.id(), "FAILED", operation.conversationId(),
                null, "PROVIDER_UNAVAILABLE", null, null, null));

        // Act
        service.onAiMention(mentionOf("@AI chỉ mục là gì và dùng khi nào?"));

        // Assert: the reason, not a blanket "could not answer".
        assertEquals("Trợ lý chưa trả lời được: không kết nối được dịch vụ AI."
                + " Nhắc lại @AI sau ít phút để thử lại.", postedAnswer().body());
        assertEquals(operation.id(), postedAnswer().traceId());
    }

    @Test
    void shouldNameAnUnknownFailureCodeSoTwoFailuresCanBeToldApart() {
        // Act
        String body = AiMentionAnswer.failed("SOMETHING_NEW", null).body();

        // Assert
        assertTrue(body.contains("(mã SOMETHING_NEW)"));
        assertTrue(body.startsWith(AiMentionAnswer.NOTICE_PREFIX));
    }

    @Test
    void shouldTellTheReaderWhenTheRunEndedWithoutAStatus() {
        // Arrange
        reserved(true);
        when(runner.start(eq(operation), anyBoolean(), any()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("lost")));

        // Act
        service.onAiMention(mentionOf("@AI chỉ mục là gì và dùng khi nào?"));

        // Assert
        assertEquals(AiMentionAnswer.UNAVAILABLE, postedAnswer().body());
    }

    @Test
    void shouldExplainWhyTheAssistantCouldNotTakeTheQuestion() {
        // Arrange: the commenter already has two questions running.
        when(operations.reserve(any(), any(), any(), any(), any())).thenThrow(new ChatOperationError(
                "CHAT_BUSY", HttpStatus.CONFLICT, "Bạn đang có hai yêu cầu đang xử lý."));

        // Act
        service.onAiMention(mentionOf("@AI chỉ mục là gì và dùng khi nào?"));

        // Assert
        assertEquals("Trợ lý chưa trả lời được: Bạn đang có hai yêu cầu đang xử lý."
                + " Nhắc lại @AI sau ít phút để thử lại.", postedAnswer().body());
        verify(runner, never()).start(any(), anyBoolean(), any());
    }

    @Test
    void shouldStartEveryNoticeWithThePrefixClientsShowAsAStatusLine() {
        // Assert: comment-thread.ts on web keys on this exact prefix.
        assertTrue(AiMentionAnswer.UNAVAILABLE.startsWith(AiMentionAnswer.NOTICE_PREFIX));
        assertTrue(AiMentionAnswer.declined("lý do").body().startsWith(AiMentionAnswer.NOTICE_PREFIX));
    }

    @Test
    void shouldNotAskTwiceWhenTheMentionWasAlreadyTaken() {
        // Arrange
        reserved(false);

        // Act
        service.onAiMention(mentionOf("@AI chỉ mục là gì và dùng khi nào?"));

        // Assert
        verify(runner, never()).start(any(), anyBoolean(), any());
        verify(writer, never()).post(any(), any());
    }

    private void reserved(boolean created) {
        when(operations.reserve(any(), any(), any(), any(), any()))
                .thenReturn(new ChatOperationService.Reservation(operation, created));
    }

    private void finishedWith(ChatOperationResponse status) {
        when(runner.start(eq(operation), eq(false), any())).thenReturn(CompletableFuture.completedFuture(status));
    }

    private AiMentionAnswer postedAnswer() {
        ArgumentCaptor<AiMentionAnswer> captor = ArgumentCaptor.forClass(AiMentionAnswer.class);
        verify(writer).post(any(AiMentionEvent.class), captor.capture());
        return captor.getValue();
    }

    private ChatOperationResponse completed(QuestionResponse result) {
        return new ChatOperationResponse(operation.id(), "COMPLETED", operation.conversationId(),
                result, null, null, null, null);
    }

    private QuestionResponse answer() {
        CitationResponse citation = new CitationResponse(documentId, "giao-trinh-csdl.pdf", "trang 12",
                "B-Tree index...", 0.91, "1", "chunk-1", 1, "a".repeat(64));
        return new QuestionResponse(UUID.randomUUID(), operation.conversationId(), "ANSWER",
                "Chỉ mục giúp truy vấn nhanh hơn [1].", "FACT", "v1.0", List.of(citation), null,
                operation.requestId(), 0.87, false, null, operation.id(), "STRICT", List.of());
    }

    private QuestionResponse refusal(String reason) {
        return new QuestionResponse(UUID.randomUUID(), operation.conversationId(), "REFUSE", reason,
                "UNKNOWN", "v1.0", List.of(), "CLOUD_NOT_ALLOWED", operation.requestId(), null, null, null,
                operation.id(), "STRICT", List.of());
    }

    private AiMentionEvent mentionOf(String body) {
        return new AiMentionEvent(workspaceId, discussionId, triggerReplyId, "Chỉ mục trong CSDL", body, asker);
    }

    private ChatOperation operation() {
        ChatSourceSnapshot snapshot = new ChatSourceSnapshot(workspaceId, 1L, 1L, true, "f".repeat(64), List.of());
        Instant now = Instant.now();
        return new ChatOperation(UUID.randomUUID(), asker, triggerReplyId, "hash", workspaceId, null,
                UUID.randomUUID(), UUID.randomUUID(), null, "chỉ mục là gì", false,
                "ai-mention-" + triggerReplyId, "RUNNING", snapshot, null,
                now.plusSeconds(240), now.plusSeconds(90), now.plusSeconds(86400));
    }
}
