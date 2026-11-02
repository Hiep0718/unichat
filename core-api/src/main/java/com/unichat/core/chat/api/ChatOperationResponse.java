package com.unichat.core.chat.api;

import java.util.UUID;

/** Owner-visible operation status; result is rebuilt from authorized persisted data. */
public record ChatOperationResponse(UUID operationId, String state, UUID conversationId,
        QuestionResponse result, String errorCode, ChatTaskType taskType,
        ChatOperationProgress progress, WorkspaceSummaryResult summaryResult) {
    /** Preserves question operation response construction while adding summary metadata. */
    public ChatOperationResponse(UUID operationId, String state, UUID conversationId,
            QuestionResponse result, String errorCode) {
        this(operationId, state, conversationId, result, errorCode, ChatTaskType.QUESTION, null, null);
    }
}
