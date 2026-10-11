package com.unichat.core.chat.api;

import java.util.UUID;

/** Owner-visible operation status; result is rebuilt from authorized persisted data. */
public record ChatOperationResponse(UUID operationId, String state, UUID conversationId,
        QuestionResponse result, String errorCode) { }
