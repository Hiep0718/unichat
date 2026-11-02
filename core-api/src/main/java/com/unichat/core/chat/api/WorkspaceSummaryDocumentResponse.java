package com.unichat.core.chat.api;

import java.util.List;
import java.util.UUID;

/** Paginated authorized document summary with its original chunk citations. */
public record WorkspaceSummaryDocumentResponse(UUID documentId, String fileName, String summary,
        List<String> topics, List<WorkspaceSummaryClaimInput> citations, int processedChunkCount,
        List<WorkspaceSummarySourceInput> sources) { }
