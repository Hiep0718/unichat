package com.unichat.core.document.messaging;

import java.util.UUID;

/**
 * Message payload sent over RabbitMQ for document ingestion.
 */
public record DocumentIngestionMessage(
        UUID documentId,
        UUID workspaceId,
        String storageKey,
        String mediaType,
        String originalName,
        String requestId
) {}
