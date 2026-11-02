package com.unichat.core.document.messaging;

import java.util.UUID;

/**
 * Payload received from AI Service ingestion result queue.
 */
public record IngestionResultMessage(
        UUID documentId,
        boolean success,
        int chunkCount,
        String errorMessage,
        long indexedCharacterCount
) {
    /** Keeps compatibility with older ingestion result producers during rollout. */
    public IngestionResultMessage(UUID documentId, boolean success, int chunkCount, String errorMessage) {
        this(documentId, success, chunkCount, errorMessage, 0L);
    }
}
