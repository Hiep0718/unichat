package com.unichat.core.chat.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.chat.domain.Conversation;
import com.unichat.core.chat.domain.ConversationRepository;
import com.unichat.core.chat.domain.Message;
import com.unichat.core.chat.domain.MessageRepository;

/**
 * Builds conversation history payloads for AI Service requests and manages summary persistence.
 *
 * <p>Shared by both {@link SseChatService} (streaming) and {@link ChatService} (non-streaming)
 * to provide consistent conversation context construction and summary management.</p>
 */
@Component
public class ConversationHistoryBuilder {

    private static final Logger log = LoggerFactory.getLogger(ConversationHistoryBuilder.class);

    /** Maximum characters to keep in assistant message content for history payload. */
    static final int MAX_ASSISTANT_CONTENT_CHARS = 1200;

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;

    public ConversationHistoryBuilder(MessageRepository messageRepository,
                                      ConversationRepository conversationRepository) {
        this.messageRepository = messageRepository;
        this.conversationRepository = conversationRepository;
    }

    /**
     * Loads the most recent messages for a conversation and builds a history payload.
     *
     * @param conversationId conversation to load history for
     * @return list of {@code {role, content}} maps in chronological order, or empty list
     */
    public List<Map<String, String>> buildHistoryPayload(UUID conversationId) {
        List<Message> recentDesc = messageRepository.findTop20ByConversationIdOrderByCreatedAtDesc(conversationId);
        if (recentDesc.isEmpty()) {
            return List.of();
        }

        List<Message> chronological = new ArrayList<>(recentDesc);
        Collections.reverse(chronological);

        List<Map<String, String>> history = new ArrayList<>();
        for (Message msg : chronological) {
            String content = "ASSISTANT".equals(msg.getRole())
                    ? truncateAssistantContent(msg.getContent())
                    : msg.getContent();
            history.add(Map.of("role", msg.getRole(), "content", content));
        }
        return history;
    }

    /**
     * Truncates assistant message content for history payload.
     * Removes the "Gợi ý câu hỏi" suggestion section and limits to max chars.
     *
     * @param content raw assistant message content
     * @return truncated content suitable for conversation history
     */
    static String truncateAssistantContent(String content) {
        if (content == null || content.isEmpty()) {
            return "";
        }
        String truncated = content;
        int separatorIdx = truncated.lastIndexOf("\n---\n");
        if (separatorIdx > 0) {
            truncated = truncated.substring(0, separatorIdx).stripTrailing();
        }
        if (truncated.length() > MAX_ASSISTANT_CONTENT_CHARS) {
            truncated = truncated.substring(0, MAX_ASSISTANT_CONTENT_CHARS) + "...";
        }
        return truncated;
    }

    /**
     * Returns the existing compacted summary for a conversation, or null if none exists.
     *
     * @param conversation the conversation entity
     * @return summary text or null
     */
    public String getSummary(Conversation conversation) {
        return conversation.getSummary();
    }

    /**
     * Persists a compacted summary using optimistic locking on summaryVersion.
     *
     * @param conversationId      the conversation ID
     * @param compactedSummary    the new summary text
     * @param currentVersion      the expected current summaryVersion
     * @return true if the summary was persisted, false if skipped due to concurrent modification
     */
    @Transactional
    public boolean persistSummary(UUID conversationId, String compactedSummary, int currentVersion) {
        if (compactedSummary == null || compactedSummary.isBlank()) {
            return false;
        }
        int updated = conversationRepository.updateSummary(
                conversationId, compactedSummary, currentVersion + 1, currentVersion, Instant.now()
        );
        if (updated == 0) {
            log.warn("Summary update skipped due to concurrent modification for conversation {}", conversationId);
            return false;
        }
        return true;
    }

    /**
     * Builds the AI Service request body as a mutable HashMap.
     *
     * @param workspaceId           workspace UUID
     * @param allowedDocIds         authorized document ID strings
     * @param question              user question text
     * @param requestId             correlation request ID
     * @param allowExternalKnowledge whether to allow external knowledge expansion
     * @return mutable map ready for JSON serialization
     */
    public Map<String, Object> buildAiRequestBody(UUID workspaceId, List<String> allowedDocIds,
                                                   String question, String requestId,
                                                   boolean allowExternalKnowledge) {
        return buildAiRequestBody(workspaceId, allowedDocIds, question, requestId, allowExternalKnowledge, null, null);
    }

    /**
     * Builds the AI Service request body with conversation history and summary.
     */
    public Map<String, Object> buildAiRequestBody(UUID workspaceId, List<String> allowedDocIds,
                                                   String question, String requestId,
                                                   boolean allowExternalKnowledge,
                                                   List<Map<String, String>> conversationHistory,
                                                   String conversationSummary) {
        Map<String, Object> body = new HashMap<>();
        body.put("workspaceId", workspaceId.toString());
        body.put("allowedDocumentIds", allowedDocIds != null ? allowedDocIds : List.of());
        body.put("question", question);
        body.put("strategyVersion", "v1.0");
        body.put("requestId", requestId != null ? requestId : UUID.randomUUID().toString());
        body.put("allowExternalKnowledge", allowExternalKnowledge);
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            body.put("conversationHistory", conversationHistory);
        }
        if (conversationSummary != null && !conversationSummary.isBlank()) {
            body.put("conversationSummary", conversationSummary);
        }
        return body;
    }
}
