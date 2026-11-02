package com.unichat.core.chat.api;

import java.util.List;

/** Bounded page of document summaries belonging to one canonical workspace summary. */
public record WorkspaceSummaryDocumentsPage(List<WorkspaceSummaryDocumentResponse> content,
        int page, int size, long totalElements, int totalPages) { }
