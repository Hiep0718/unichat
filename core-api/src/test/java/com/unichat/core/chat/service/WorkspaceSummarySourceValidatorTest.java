package com.unichat.core.chat.service;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.unichat.core.chat.api.WorkspaceSummaryClaimInput;
import com.unichat.core.chat.api.WorkspaceSummaryDocumentInput;
import com.unichat.core.chat.api.WorkspaceSummarySourceInput;
import static org.junit.jupiter.api.Assertions.*;

class WorkspaceSummarySourceValidatorTest {
    @Test void shouldRejectMissingOrStaleCitationMetadata() {
        var claim = new WorkspaceSummaryClaimInput("Nội dung", List.of("doc_1"));
        var source = new WorkspaceSummarySourceInput("doc_1", "page:2", "Nội dung", "a".repeat(64), 2);
        var document = new WorkspaceSummaryDocumentInput(UUID.randomUUID(), "Tài liệu.pdf", "Tóm tắt",
                List.of(), List.of(claim), 1, List.of(source));

        assertTrue(WorkspaceSummarySourceValidator.valid(document, 2));
        assertFalse(WorkspaceSummarySourceValidator.valid(document, 3));
        var missing = new WorkspaceSummaryDocumentInput(document.documentId(), document.fileName(),
                document.summary(), document.topics(), document.claims(), 1, List.of());
        assertFalse(WorkspaceSummarySourceValidator.valid(missing, 2));
    }
}
