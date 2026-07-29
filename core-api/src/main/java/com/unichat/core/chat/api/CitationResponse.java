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
        double score
) {}
