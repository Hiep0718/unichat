package com.unichat.core.chat.service;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ChatSourceSnapshotTest {
    @Test void shouldAcceptCompleteManifestForEveryWorkspaceDocumentBeyondOneHundred() {
        var sources = IntStream.range(0, 101).mapToObj(index -> new ChatSourceSnapshot.Source(
                UUID.randomUUID(), 1, "a".repeat(64), "Tài liệu " + index, 1, 20L, Instant.now()))
                .toList();
        var snapshot = new ChatSourceSnapshot(UUID.randomUUID(), 1, 1, true, "fingerprint", sources);

        assertTrue(snapshot.validSummaryManifest());
    }
}
