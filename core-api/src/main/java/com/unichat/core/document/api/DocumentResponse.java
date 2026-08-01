package com.unichat.core.document.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentStatus;

/**
 * Response payload representing document metadata.
 */
public record DocumentResponse(
        UUID id,
        UUID workspaceId,
        String storageKey,
        String originalName,
        String mediaType,
        long byteSize,
        String sha256,
        DocumentStatus status,
        int ingestionVersion,
        int pageOrBlockCount,
        Long version,
        Instant createdAt,
        Instant updatedAt
) {
    public static DocumentResponse from(Document doc) {
        return new DocumentResponse(
                doc.getId(),
                doc.getWorkspaceId(),
                doc.getStorageKey(),
                doc.getOriginalName(),
                doc.getMediaType(),
                doc.getByteSize(),
                doc.getSha256(),
                doc.getStatus(),
                doc.getIngestionVersion(),
                doc.getPageOrBlockCount(),
                doc.getVersion(),
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
