package com.unichat.core.chat.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import com.unichat.core.chat.api.WorkspaceSummaryClaimInput;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentInput;
import com.unichat.core.chat.api.WorkspaceSummarySourceInput;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WorkspaceSummaryCheckpointVerifierTest {
    private final JdbcTemplate database = mock(JdbcTemplate.class);
    private final WorkspaceSummaryCheckpointVerifier verifier = new WorkspaceSummaryCheckpointVerifier(
            database, new ChatJson(new ObjectMapper()));

    @Test void shouldRejectFinalResultWhenAnyDocumentCheckpointIsMissing() {
        var document = new WorkspaceSummaryDocumentInput(UUID.randomUUID(), "Tài liệu.pdf", "Tóm tắt",
                List.of(), List.of(new WorkspaceSummaryClaimInput("Thông tin", List.of("chunk_1"))), 1,
                List.of(new WorkspaceSummarySourceInput("chunk_1", "page:1", "Thông tin", "a".repeat(64), 1)));

        var error = assertThrows(ChatOperationError.class,
                () -> verifier.verify(UUID.randomUUID(), List.of(document)));

        assertEquals("SUMMARY_INCOMPLETE", error.getCode());
    }

    @Test void shouldProduceStableSha256ForCanonicalCheckpoint() {
        assertEquals(verifier.hash("same content"), verifier.hash("same content"));
        assertNotEquals(verifier.hash("same content"), verifier.hash("changed content"));
    }

    @Test void shouldAcceptOnlyTheExactCompletedDocumentCheckpoint() {
        UUID operationId = UUID.randomUUID();
        var document = new WorkspaceSummaryDocumentInput(UUID.randomUUID(), "Tài liệu.pdf", "Tóm tắt",
                List.of(), List.of(new WorkspaceSummaryClaimInput("Thông tin", List.of("chunk_1"))), 1,
                List.of(new WorkspaceSummarySourceInput("chunk_1", "page:1", "Thông tin", "a".repeat(64), 1)));
        String checkpointHash = verifier.hash(new ChatJson(new ObjectMapper()).write(document));
        when(database.queryForList(anyString(), eq(operationId))).thenReturn(
                List.of(Map.of("document_id", document.documentId(), "checkpoint_hash", checkpointHash)));

        assertDoesNotThrow(() -> verifier.verify(operationId, List.of(document)));
    }
}
