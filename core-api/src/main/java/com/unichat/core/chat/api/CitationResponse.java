package com.unichat.core.chat.api;

import java.util.UUID;

/**
 * Citation details matching source document and location.
 */
public record CitationResponse(
        UUID documentId,
        String fileName,
        String locator,
        String excerpt,
        double score,
        String citationId,
        String chunkId,
        Integer ingestionVersion,
        String contentHash
) {
    /** Supports legacy consumers without inventing provenance. */
    public CitationResponse(UUID documentId, String fileName, String locator, String excerpt, double score) {
        this(documentId, fileName, locator, excerpt, score, null, null, null, null);
    }
}
