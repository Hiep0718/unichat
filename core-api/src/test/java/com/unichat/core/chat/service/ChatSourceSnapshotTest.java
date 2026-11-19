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

    @Test void shouldKeepTheWorkspaceFingerprintWhenScopedToOneDocument() {
        var kept = new ChatSourceSnapshot.Source(UUID.randomUUID(), 1, "a".repeat(64), "giữ.pdf");
        var other = new ChatSourceSnapshot.Source(UUID.randomUUID(), 1, "b".repeat(64), "khác.pdf");
        var snapshot = new ChatSourceSnapshot(UUID.randomUUID(), 4, 2, true, "fingerprint", java.util.List.of(kept, other));

        var scoped = snapshot.scopedTo(kept.documentId());

        assertEquals(java.util.List.of(kept), scoped.sources());
        assertEquals("fingerprint", scoped.fingerprint());
        assertEquals(4, scoped.permissionVersion());
    }
    @Test void shouldRefuseAScopeThatIsNotAnAuthorizedSource() {
        var snapshot = new ChatSourceSnapshot(UUID.randomUUID(), 1, 1, true, "fingerprint", java.util.List.of());

        var error = assertThrows(ChatOperationError.class, () -> snapshot.scopedTo(UUID.randomUUID()));

        assertEquals("SOURCE_UNAVAILABLE", error.getCode());
    }
}
