package com.unichat.core.document.api;

import java.util.UUID;

import com.unichat.core.document.domain.DocumentStatus;

/**
 * Response payload for 202 Accepted upload and job status tracking.
 */
public record IngestionJobResponse(
        UUID documentId,
        UUID jobId,
        DocumentStatus status,
        String message
) {}
