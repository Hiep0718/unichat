package com.unichat.core.document.messaging;

import java.util.UUID;

/**
 * Payload received from AI Service ingestion result queue.
 */
public record IngestionResultMessage(
        UUID documentId,
        boolean success,
        int chunkCount,
        String errorMessage
) {}
