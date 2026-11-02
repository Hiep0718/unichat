package com.unichat.core.chat.service;

import java.util.List;
import java.time.Instant;
import java.util.UUID;

/** Core-authorized source metadata; hashes describe documents, not fabricated chunks. */
public record ChatSourceSnapshot(UUID workspaceId, long permissionVersion, long workspaceVersion,
        boolean cloudAllowed, String fingerprint, List<Source> sources) {
    /** Requires genuine processed-source metadata before crossing the AI boundary. */
    public boolean validMetadata() {
        return sources.size() <= 1000 && sources.stream().allMatch(source -> source.ingestionVersion() > 0
                && source.contentHash() != null && source.contentHash().matches("[0-9a-f]{64}")
                && source.fileName() != null && !source.fileName().isBlank());
    }

    /** Requires a complete ingestion manifest for every source in this snapshot. */
    public boolean validSummaryManifest() {
        return !sources.isEmpty() && sources.stream().allMatch(source -> source.indexedChunkCount() != null
                && source.indexedChunkCount() > 0 && source.indexedCharacterCount() != null
                && source.indexedCharacterCount() > 0 && source.ingestionCompletedAt() != null);
    }

    /** A current, processed source authorized by Core. */
    public record Source(UUID documentId, int ingestionVersion, String contentHash, String fileName,
                         Integer indexedChunkCount, Long indexedCharacterCount, Instant ingestionCompletedAt) {
        /** Preserves callers creating ordinary retrieval snapshots. */
        public Source(UUID documentId, int ingestionVersion, String contentHash, String fileName) {
            this(documentId, ingestionVersion, contentHash, fileName, null, null, null);
        }
    }
}
