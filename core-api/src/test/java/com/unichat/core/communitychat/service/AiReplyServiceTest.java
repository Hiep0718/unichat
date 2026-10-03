package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import com.unichat.core.communitychat.domain.AiMentionEvent;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.ReplyCitation;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.shared.config.ServiceTokenIssuer;

/**
 * The assistant answers a thread with sources a reader can check, and says so
 * plainly when it cannot answer at all.
 */
class AiReplyServiceTest {

    private static final String ANSWERS_URL = "http://ai.test/internal/v1/retrieval/answers";

    private DocumentRepository documentRepository;
    private DiscussionRepository discussionRepository;
    private DiscussionReplyRepository replyRepository;
    private MockRestServiceServer aiService;
    private AiReplyService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID discussionId = UUID.randomUUID();
    private final UUID triggerReplyId = UUID.randomUUID();
    private final UUID askerId = UUID.randomUUID();
    private final UUID documentId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentRepository.class);
        discussionRepository = mock(DiscussionRepository.class);
        replyRepository = mock(DiscussionReplyRepository.class);
        ServiceTokenIssuer tokenIssuer = mock(ServiceTokenIssuer.class);
        when(tokenIssuer.issueToken()).thenReturn("Bearer test-token");

        RestTemplate restTemplate = new RestTemplate();
        aiService = MockRestServiceServer.bindTo(restTemplate).build();
        AiRetrievalClient retrievalClient = new AiRetrievalClient(tokenIssuer, restTemplate);
        ReflectionTestUtils.setField(retrievalClient, "aiServiceUrl", "http://ai.test");
        service = new AiReplyService(documentRepository, discussionRepository,
                replyRepository, retrievalClient);

        when(documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId)))
                .thenReturn(List.of(documentId));
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(discussion()));
    }

    @Test
    void postsTheAnswerAsTheAssistantRatherThanAsThePersonWhoAsked() {
        aiService.expect(requestTo(ANSWERS_URL))
                .andExpect(header("Authorization", "Bearer test-token"))
                .andRespond(withSuccess(answerJson(), MediaType.APPLICATION_JSON));

        service.onAiMention(mentionOf("@AI chỉ số là gì và dùng khi nào?"));

        assertEquals(AiReplyService.ASSISTANT_USER_ID, savedReply().getAuthorId());
        assertTrue(savedReply().isAiAnswer());
        assertEquals(triggerReplyId, savedReply().getParentReplyId());
    }

    @Test
    void keepsTheCitationsSoAReaderCanOpenTheSourceDocument() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.of(document()));
        aiService.expect(requestTo(ANSWERS_URL))
                .andRespond(withSuccess(answerJson(), MediaType.APPLICATION_JSON));

        service.onAiMention(mentionOf("@AI chỉ số là gì và dùng khi nào?"));

        List<ReplyCitation> citations = savedReply().getCitations();
        assertEquals(1, citations.size());
        assertEquals("1", citations.get(0).citationId());
        assertEquals(documentId.toString(), citations.get(0).documentId());
        assertEquals("giao-trinh-csdl.pdf", citations.get(0).fileName());
        assertEquals("trang 12", citations.get(0).locator());
    }

    @Test
    void labelsACitationWhoseDocumentIsNoLongerInTheLibrary() {
        when(documentRepository.findById(documentId)).thenReturn(Optional.empty());
        aiService.expect(requestTo(ANSWERS_URL))
                .andRespond(withSuccess(answerJson(), MediaType.APPLICATION_JSON));

        service.onAiMention(mentionOf("@AI chỉ số là gì và dùng khi nào?"));

        assertEquals("Tài liệu tham khảo", savedReply().getCitations().get(0).fileName());
    }

    @Test
    void recordsTheRetrievalTraceItAnsweredFrom() {
        aiService.expect(requestTo(ANSWERS_URL))
                .andExpect(jsonPath("$.requestId").exists())
                .andRespond(withSuccess(answerJson(), MediaType.APPLICATION_JSON));

        service.onAiMention(mentionOf("@AI chỉ số là gì và dùng khi nào?"));

        assertNotNull(savedReply().getRetrievalTraceId());
    }

    @Test
    void restoresThePostTopicWhenTheQuestionIsTooShortToStandAlone() {
        aiService.expect(requestTo(ANSWERS_URL))
                .andExpect(jsonPath("$.question")
                        .value("Trong chủ đề \"Chỉ mục trong CSDL\", vì sao?"))
                .andRespond(withSuccess(answerJson(), MediaType.APPLICATION_JSON));

        service.onAiMention(mentionOf("@AI vì sao?"));

        aiService.verify();
    }

    @Test
    void tellsTheReaderWhenTheAiServiceCannotBeReached() {
        aiService.expect(requestTo(ANSWERS_URL)).andRespond(withServerError());

        service.onAiMention(mentionOf("@AI chỉ số là gì và dùng khi nào?"));

        assertTrue(savedReply().getBody().contains("chưa trả lời được"));
        assertTrue(savedReply().getCitations().isEmpty());
    }

    @Test
    void passesTheRefusalReasonThroughWhenTheEvidenceIsInsufficient() {
        String refusal = """
                {"decision":"REFUSE","refusalCode":"EVIDENCE_INSUFFICIENT",
                 "refusalReason":"Tài liệu hiện có chưa đủ để trả lời câu hỏi này."}
                """;
        aiService.expect(requestTo(ANSWERS_URL))
                .andRespond(withSuccess(refusal, MediaType.APPLICATION_JSON));

        service.onAiMention(mentionOf("@AI chỉ số là gì và dùng khi nào?"));

        assertEquals("Tài liệu hiện có chưa đủ để trả lời câu hỏi này.", savedReply().getBody());
    }

    @Test
    void countsTheAssistantReplyOnTheThread() {
        Discussion discussion = discussion();
        when(discussionRepository.findById(discussionId)).thenReturn(Optional.of(discussion));
        aiService.expect(requestTo(ANSWERS_URL))
                .andRespond(withSuccess(answerJson(), MediaType.APPLICATION_JSON));

        service.onAiMention(mentionOf("@AI chỉ số là gì và dùng khi nào?"));

        assertEquals(1, discussion.getReplyCount());
        verify(discussionRepository).save(discussion);
    }

    private DiscussionReply savedReply() {
        ArgumentCaptor<DiscussionReply> captor = ArgumentCaptor.forClass(DiscussionReply.class);
        verify(replyRepository).save(captor.capture());
        return captor.getValue();
    }

    private AiMentionEvent mentionOf(String body) {
        return new AiMentionEvent(workspaceId, discussionId, triggerReplyId,
                "Chỉ mục trong CSDL", body);
    }

    private Discussion discussion() {
        return new Discussion(discussionId, workspaceId, askerId, "Chỉ mục trong CSDL",
                "Mình chưa rõ phần này", "QUESTION", false, "OPEN", Instant.now());
    }

    private Document document() {
        return new Document(documentId, workspaceId, "key", "giao-trinh-csdl.pdf",
                "application/pdf", 1024L, "sha", DocumentStatus.PROCESSED,
                askerId, Instant.now());
    }

    private String answerJson() {
        return """
                {"decision":"ANSWER","intent":"FACT","evidenceScore":0.87,
                 "answer":"Chỉ mục giúp truy vấn nhanh hơn [1].",
                 "citations":[{"citationId":"1","documentId":"%s",
                   "locator":"trang 12","excerpt":"B-Tree index...","score":0.91}]}
                """.formatted(documentId);
    }
}
