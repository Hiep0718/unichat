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
        Double evidenceScore
) {}
