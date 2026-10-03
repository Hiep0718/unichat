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
        Instant updatedAt,
        UUID uploadedBy,
        /** Email of the contributor, resolved for moderation screens. */
        String uploadedByEmail,
        UUID approvedBy,
        Instant approvedAt,
        String rejectionReason,
        String contributionSummary,
        String contributionReason
) {
    public static DocumentResponse from(Document doc) {
        return from(doc, null);
    }

    /**
     * Maps a document, including who contributed it.
     *
     * @param uploaderEmail contributor email, null when not resolved
     */
    public static DocumentResponse from(Document doc, String uploaderEmail) {
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
                doc.getUpdatedAt(),
                doc.getUploadedBy(),
                uploaderEmail,
                doc.getApprovedBy(),
                doc.getApprovedAt(),
                doc.getRejectionReason(),
                doc.getContributionSummary(),
                doc.getContributionReason()
        );
    }
}
