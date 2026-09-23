package com.unichat.core.chat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.Message;
import com.unichat.core.chat.domain.MessageRepository;

class ConversationHistoryBuilderTest {

    private MessageRepository messageRepository;
    private ConversationRepository conversationRepository;
    private ConversationHistoryBuilder builder;

    @BeforeEach
    void setUp() {
        messageRepository = mock(MessageRepository.class);
        conversationRepository = mock(ConversationRepository.class);
        builder = new ConversationHistoryBuilder(messageRepository, conversationRepository);
    }

    @Test
    void shouldReturnEmptyHistoryWhenNoMessagesExist() {
        UUID conversationId = UUID.randomUUID();
        when(messageRepository.findTop20ByConversationIdOrderByCreatedAtDesc(conversationId))
                .thenReturn(List.of());

        List<Map<String, String>> history = builder.buildHistoryPayload(conversationId);

        assertTrue(history.isEmpty());
    }

    @Test
    void shouldReverseChronologicalOrderAndTruncateAssistantContent() {
        UUID conversationId = UUID.randomUUID();
        Instant now = Instant.now();

        // Messages returned DESC: m2 (assistant), m1 (user)
        Message m1 = new Message(UUID.randomUUID(), conversationId, "USER", "Khái niệm OOP?", null, null, null, now.minusSeconds(10));
        Message m2 = new Message(UUID.randomUUID(), conversationId, "ASSISTANT", "OOP là lập trình hướng đối tượng.\n---\n### Gợi ý:\n- Gợi ý 1", null, null, null, now);

        when(messageRepository.findTop20ByConversationIdOrderByCreatedAtDesc(conversationId))
                .thenReturn(List.of(m2, m1));

        List<Map<String, String>> history = builder.buildHistoryPayload(conversationId);

        assertEquals(2, history.size());
        // First in payload should be chronological m1 (USER)
        assertEquals("USER", history.get(0).get("role"));
        assertEquals("Khái niệm OOP?", history.get(0).get("content"));

        // Second should be m2 (ASSISTANT) truncated
        assertEquals("ASSISTANT", history.get(1).get("role"));
        assertEquals("OOP là lập trình hướng đối tượng.", history.get(1).get("content"));
    }

    @Test
    void shouldTruncateAssistantContentCorrectly() {
        assertEquals("", ConversationHistoryBuilder.truncateAssistantContent(null));
        assertEquals("", ConversationHistoryBuilder.truncateAssistantContent(""));

        String textWithSuggestions = "Phần trả lời chính xác.\n---\n💡 Gợi ý câu hỏi:";
        assertEquals("Phần trả lời chính xác.", ConversationHistoryBuilder.truncateAssistantContent(textWithSuggestions));

        String oversized = "x".repeat(1500);
        String truncated = ConversationHistoryBuilder.truncateAssistantContent(oversized);
        assertEquals(1203, truncated.length()); // 1200 + "..."
        assertTrue(truncated.endsWith("..."));
    }

    @Test
    void shouldGetSummaryFromConversation() {
        Conversation conv = new Conversation(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "Test", Instant.now());
        assertNull(builder.getSummary(conv));

        conv.setSummary("Tóm tắt hội thoại trước đó");
        assertEquals("Tóm tắt hội thoại trước đó", builder.getSummary(conv));
    }

    @Test
    void shouldPersistSummaryWithOptimisticLocking() {
        UUID conversationId = UUID.randomUUID();

        // Null or blank summary returns false
        assertFalse(builder.persistSummary(conversationId, null, 0));
        assertFalse(builder.persistSummary(conversationId, "   ", 0));

        // Successful update (1 row updated)
        when(conversationRepository.updateSummary(eq(conversationId), eq("Bản tóm tắt"), eq(1), eq(0), any()))
                .thenReturn(1);
        assertTrue(builder.persistSummary(conversationId, "Bản tóm tắt", 0));

        // Optimistic locking failure (0 rows updated)
        when(conversationRepository.updateSummary(eq(conversationId), eq("Bản tóm tắt"), eq(2), eq(1), any()))
                .thenReturn(0);
        assertFalse(builder.persistSummary(conversationId, "Bản tóm tắt", 1));
    }

    @Test
    void shouldBuildAiRequestBodyWithAllFields() {
        UUID workspaceId = UUID.randomUUID();
        List<String> docIds = List.of("doc-1", "doc-2");
        List<Map<String, String>> history = List.of(Map.of("role", "USER", "content", "Xin chào"));

        Map<String, Object> body = builder.buildAiRequestBody(
                workspaceId, docIds, "Câu hỏi RAG?", "req-123", true, history, "Tóm tắt"
        );

        assertNotNull(body);
        assertEquals(workspaceId.toString(), body.get("workspaceId"));
        assertEquals(docIds, body.get("allowedDocumentIds"));
        assertEquals("Câu hỏi RAG?", body.get("question"));
        assertEquals("req-123", body.get("requestId"));
        assertEquals(true, body.get("allowExternalKnowledge"));
        assertEquals(history, body.get("conversationHistory"));
        assertEquals("Tóm tắt", body.get("conversationSummary"));
    }
}
