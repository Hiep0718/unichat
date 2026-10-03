package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import com.unichat.core.communitychat.domain.AttachmentKind;
import com.unichat.core.communitychat.domain.PostAttachment;
import com.unichat.core.communitychat.domain.PostAttachmentRepository;
import com.unichat.core.communitychat.domain.SummaryState;
import com.unichat.core.document.domain.DocumentProcessedEvent;
import com.unichat.core.shared.config.ServiceTokenIssuer;

/**
 * A document posted to a thread is summarised once it becomes readable, from
 * that document alone, and says so plainly when no summary could be made.
 */
class AttachmentSummaryServiceTest {

    private static final String ANSWERS_URL = "http://ai.test/internal/v1/retrieval/answers";

    private PostAttachmentRepository attachmentRepository;
    private MockRestServiceServer aiService;
    private AttachmentSummaryService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID documentId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID uploaderId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        attachmentRepository = mock(PostAttachmentRepository.class);
        ServiceTokenIssuer tokenIssuer = mock(ServiceTokenIssuer.class);
        when(tokenIssuer.issueToken()).thenReturn("Bearer test-token");

        RestTemplate restTemplate = new RestTemplate();
        aiService = MockRestServiceServer.bindTo(restTemplate).build();
        AiRetrievalClient retrievalClient = new AiRetrievalClient(tokenIssuer, restTemplate);
        ReflectionTestUtils.setField(retrievalClient, "aiServiceUrl", "http://ai.test");
        service = new AttachmentSummaryService(attachmentRepository, retrievalClient);
    }

    @Test
    void shouldSummariseFromTheAttachedDocumentAloneRatherThanTheWholeLibrary() {
        // Arrange
        when(attachmentRepository.findByDocumentId(documentId)).thenReturn(List.of(attachment()));
        aiService.expect(requestTo(ANSWERS_URL))
                .andExpect(jsonPath("$.allowedDocumentIds.length()").value(1))
                .andExpect(jsonPath("$.allowedDocumentIds[0]").value(documentId.toString()))
                .andRespond(withSuccess(summaryJson(), MediaType.APPLICATION_JSON));

        // Act
        service.onDocumentProcessed(new DocumentProcessedEvent(documentId, workspaceId));

        // Assert
        aiService.verify();
    }

    @Test
    void shouldStoreTheSummaryAndMarkItReadyForTheReader() {
        // Arrange
        when(attachmentRepository.findByDocumentId(documentId)).thenReturn(List.of(attachment()));
        aiService.expect(requestTo(ANSWERS_URL))
                .andRespond(withSuccess(summaryJson(), MediaType.APPLICATION_JSON));

        // Act
        service.onDocumentProcessed(new DocumentProcessedEvent(documentId, workspaceId));

        // Assert
        PostAttachment saved = savedAttachment();
        assertEquals(SummaryState.READY, saved.getSummaryState());
        assertTrue(saved.getAiSummary().contains("chỉ mục"));
    }

    @Test
    void shouldMarkTheSummaryUnavailableWhenTheAssistantRefuses() {
        // Arrange: a refusal carries no answer, and is not a summary.
        when(attachmentRepository.findByDocumentId(documentId)).thenReturn(List.of(attachment()));
        String refusal = """
                {"decision":"REFUSE","refusalCode":"EVIDENCE_INSUFFICIENT",
                 "refusalReason":"Không đủ dữ liệu."}
                """;
        aiService.expect(requestTo(ANSWERS_URL))
                .andRespond(withSuccess(refusal, MediaType.APPLICATION_JSON));

        // Act
        service.onDocumentProcessed(new DocumentProcessedEvent(documentId, workspaceId));

        // Assert
        PostAttachment saved = savedAttachment();
        assertEquals(SummaryState.UNAVAILABLE, saved.getSummaryState());
        assertNull(saved.getAiSummary());
    }

    @Test
    void shouldMarkTheSummaryUnavailableWhenTheAiServiceCannotBeReached() {
        // Arrange
        when(attachmentRepository.findByDocumentId(documentId)).thenReturn(List.of(attachment()));
        aiService.expect(requestTo(ANSWERS_URL)).andRespond(withServerError());

        // Act
        service.onDocumentProcessed(new DocumentProcessedEvent(documentId, workspaceId));

        // Assert
        assertEquals(SummaryState.UNAVAILABLE, savedAttachment().getSummaryState());
    }

    @Test
    void shouldSummariseEverySharedAttachmentWhenTheSameFileWasPostedTwice() {
        // Arrange
        when(attachmentRepository.findByDocumentId(documentId))
                .thenReturn(List.of(attachment(), attachment()));
        aiService.expect(requestTo(ANSWERS_URL))
                .andRespond(withSuccess(summaryJson(), MediaType.APPLICATION_JSON));

        // Act
        service.onDocumentProcessed(new DocumentProcessedEvent(documentId, workspaceId));

        // Assert: one retrieval run, both attachments updated.
        aiService.verify();
        verify(attachmentRepository, org.mockito.Mockito.times(2)).save(any());
    }

    @Test
    void shouldNotCallTheAiServiceForAnOrdinaryLibraryUpload() {
        // Arrange: a document nobody attached to a post.
        when(attachmentRepository.findByDocumentId(documentId)).thenReturn(List.of());

        // Act
        service.onDocumentProcessed(new DocumentProcessedEvent(documentId, workspaceId));

        // Assert
        aiService.verify();
        verify(attachmentRepository, never()).save(any());
    }

    private PostAttachment savedAttachment() {
        ArgumentCaptor<PostAttachment> captor = ArgumentCaptor.forClass(PostAttachment.class);
        verify(attachmentRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        return captor.getValue();
    }

    private PostAttachment attachment() {
        return new PostAttachment(UUID.randomUUID(), discussionId, AttachmentKind.DOCUMENT,
                "posts/key", "giao-trinh-csdl.pdf", "application/pdf", 2048L,
                documentId, uploaderId, Instant.now());
    }

    private String summaryJson() {
        return """
                {"decision":"ANSWER","intent":"SUMMARY","evidenceScore":0.9,
                 "answer":"Tài liệu trình bày cách đánh chỉ mục trong CSDL quan hệ.",
                 "citations":[]}
                """;
    }
}
