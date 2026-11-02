package com.unichat.core.chat.api;

import java.util.List;
import java.util.UUID;

/** Canonical workspace summary overview and cross-document insights. */
public record WorkspaceSummaryResult(UUID summaryId, UUID messageId, String overview, List<String> overviewChunkIds,
        List<WorkspaceSummaryInsightInput> crossDocumentInsights, int documentCount, long processedChunkCount) { }
