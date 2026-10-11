package com.unichat.core.chat.service;

import java.util.List;
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
    /** A current, processed source authorized by Core. */
    public record Source(UUID documentId, int ingestionVersion, String contentHash, String fileName) { }
}
