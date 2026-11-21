package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
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
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatOperationError;
import com.unichat.core.chat.service.ChatOperationRunner;
import com.unichat.core.chat.service.ChatOperationService;
import com.unichat.core.chat.service.ChatSourceSnapshot;
import com.unichat.core.communitychat.api.PostAttachmentResponse;
import com.unichat.core.communitychat.domain.AttachmentKind;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.SummaryState;

/**
 * A member asks for an attachment's summary; it is produced from that document
 * alone, as their own authorized chat operation, and stored for every reader.
 */
class AttachmentSummaryServiceTest {

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID documentId = UUID.randomUUID();
    private final ChatActor asker = new ChatActor(UUID.randomUUID(), UUID.randomUUID(), 2L);

    private AttachmentSummaryStore store;
    private ChatOperationService operations;
    private ChatOperationRunner runner;
    private AttachmentSummaryService service;
    private PostAttachment attachment;
    private ChatOperation operation;

    @BeforeEach
    void setUp() {
        store = mock(AttachmentSummaryStore.class);
        operations = mock(ChatOperationService.class);
        runner = mock(ChatOperationRunner.class);
        service = new AttachmentSummaryService(store, operations, runner);
        attachment = new PostAttachment(UUID.randomUUID(), discussionId, AttachmentKind.DOCUMENT, "key",
                "giao-trinh.pdf", "application/pdf", 2048L, documentId, asker.userId(), Instant.now());
        operation = operation();
        when(store.readSummarisable(workspaceId, discussionId, attachment.getId(), asker.userId()))
                .thenReturn(attachment);
    }

    @Test
    void shouldSummariseFromTheAttachedDocumentAloneAsTheAskingMember() {
        // Arrange
        reserved();
        finishedWith(completed(answer("Giáo trình trình bày chỉ mục B-Tree.")));

        // Act
        request();

        // Assert
        ArgumentCaptor<AskQuestionRequest> question = ArgumentCaptor.forClass(AskQuestionRequest.class);
        verify(operations).reserve(eq(asker), eq(workspaceId), question.capture(), any(), any(), eq(documentId));
        assertEquals(AttachmentSummaryService.QUESTION, question.getValue().question());
    }

    @Test
    void shouldStoreTheSummaryForEveryReader() {
        // Arrange
        reserved();
        finishedWith(completed(answer("  Giáo trình trình bày chỉ mục B-Tree.  ")));

        // Act
        request();

        // Assert
        verify(store).record(workspaceId, discussionId, attachment.getId(), "Giáo trình trình bày chỉ mục B-Tree.");
    }

    @Test
    void shouldAnswerPendingAndMarkTheRequestBeforeTheOperationRuns() {
        // Arrange
        reserved();
        when(runner.start(eq(operation), eq(false), any())).thenReturn(new CompletableFuture<>());

        // Act
        PostAttachmentResponse response = request();

        // Assert
        assertEquals(SummaryState.PENDING, response.summaryState());
        verify(store).markRequested(attachment.getId());
        verify(store, never()).record(any(), any(), any(), any());
    }

    @Test
    void shouldReturnAnExistingSummaryWithoutAskingAgain() {
        // Arrange
        attachment.attachSummary("Đã có tóm tắt.");

        // Act
        PostAttachmentResponse response = request();

        // Assert
        assertEquals(SummaryState.READY, response.summaryState());
        verify(operations, never()).reserve(any(), any(), any(), any(), any(), any());
    }

    @Test
    void shouldStoreNoSummaryWhenTheAssistantRefuses() {
        // Arrange
        reserved();
        finishedWith(completed(refusal()));

        // Act
        request();

        // Assert
        verify(store).record(eq(workspaceId), eq(discussionId), eq(attachment.getId()), isNull());
    }

    @Test
    void shouldStoreNoSummaryWhenTheOperationFailed() {
        // Arrange
        reserved();
        finishedWith(new ChatOperationResponse(operation.id(), "FAILED", operation.conversationId(),
                null, "PROVIDER_UNAVAILABLE", null, null, null));

        // Act
        request();

        // Assert
        verify(store).record(eq(workspaceId), eq(discussionId), eq(attachment.getId()), isNull());
    }

    @Test
    void shouldLeaveTheAttachmentUntouchedWhenTheMemberCannotAskRightNow() {
        // Arrange: the member already has two questions running.
        when(operations.reserve(any(), any(), any(), any(), any(), any())).thenThrow(new ChatOperationError(
                "CHAT_BUSY", HttpStatus.CONFLICT, "Bạn đang có hai yêu cầu đang xử lý."));

        // Act & Assert
        assertThrows(ChatOperationError.class, this::request);
        verify(store, never()).markRequested(any());
        verify(runner, never()).start(any(), anyBoolean(), any());
    }

    @Test
    void shouldCutAnOverlongSummary() {
        // Act
        String summary = AttachmentSummaryService.summaryOf(completed(answer("a".repeat(2000))), null);

        // Assert
        assertEquals(1501, summary.length());
        assertTrue(summary.endsWith("…"));
    }

    @Test
    void shouldTreatALostOperationAsNoSummary() {
        // Act & Assert
        assertNull(AttachmentSummaryService.summaryOf(null, new IllegalStateException("lost")));
    }

    private PostAttachmentResponse request() {
        return service.request(workspaceId, discussionId, attachment.getId(), asker);
    }

    private void reserved() {
        when(operations.reserve(any(), any(), any(), any(), any(), any()))
                .thenReturn(new ChatOperationService.Reservation(operation, true));
    }

    private void finishedWith(ChatOperationResponse status) {
        when(runner.start(eq(operation), eq(false), any())).thenReturn(CompletableFuture.completedFuture(status));
    }

    private ChatOperationResponse completed(QuestionResponse result) {
        return new ChatOperationResponse(operation.id(), "COMPLETED", operation.conversationId(),
                result, null, null, null, null);
    }

    private QuestionResponse answer(String text) {
        return new QuestionResponse(UUID.randomUUID(), operation.conversationId(), "ANSWER", text, "SUMMARY",
                "v1.0", List.of(), null, operation.requestId(), 0.9, false, null, operation.id(), "STRICT", List.of());
    }

    private QuestionResponse refusal() {
        return new QuestionResponse(UUID.randomUUID(), operation.conversationId(), "REFUSE",
                "Tài liệu chưa đủ để tóm tắt.", "UNKNOWN", "v1.0", List.of(), "EVIDENCE_INSUFFICIENT",
                operation.requestId(), null, null, null, operation.id(), "STRICT", List.of());
    }

    private ChatOperation operation() {
        ChatSourceSnapshot snapshot = new ChatSourceSnapshot(workspaceId, 1L, 1L, true, "f".repeat(64), List.of());
        Instant now = Instant.now();
        return new ChatOperation(UUID.randomUUID(), asker, UUID.randomUUID(), "hash", workspaceId, null,
                UUID.randomUUID(), UUID.randomUUID(), null, AttachmentSummaryService.QUESTION, false,
                "attachment-summary-1", "RUNNING", snapshot, null,
                now.plusSeconds(240), now.plusSeconds(90), now.plusSeconds(86400));
    }
}
