package com.unichat.core.chat.api;

import java.util.List;
import java.util.UUID;

/**
 * Response payload matching api-contracts.md section 5.
 */
public record QuestionResponse(
        UUID messageId,
        UUID conversationId,
        String decision,
        String answer,
        String intent,
        String strategyVersion,
        List<CitationResponse> citations,
        String refusalCode,
        String requestId,
        Double evidenceScore,
        Boolean singleSourceWarning,
        String warningMessage,
        UUID operationId,
        String knowledgeMode,
        List<AnswerSection> sections,
        String providerModel
) {
    /** Preserves callers that do not have a provider model. */
    public QuestionResponse(UUID messageId, UUID conversationId, String decision, String answer,
            String intent, String strategyVersion, List<CitationResponse> citations, String refusalCode,
            String requestId, Double evidenceScore, Boolean singleSourceWarning, String warningMessage,
            UUID operationId, String knowledgeMode, List<AnswerSection> sections) {
        this(messageId, conversationId, decision, answer, intent, strategyVersion, citations, refusalCode,
                requestId, evidenceScore, singleSourceWarning, warningMessage, operationId, knowledgeMode,
                sections, null);
    }
    /** Retains source compatibility for existing internal consumers. */
    public QuestionResponse(UUID messageId, UUID conversationId, String decision, String answer,
            String intent, String strategyVersion, List<CitationResponse> citations, String refusalCode,
            String requestId, Double evidenceScore, Boolean singleSourceWarning, String warningMessage) {
        this(messageId, conversationId, decision, answer, intent, strategyVersion, citations, refusalCode,
                requestId, evidenceScore, singleSourceWarning, warningMessage, null, "STRICT", List.of());
    }
}
