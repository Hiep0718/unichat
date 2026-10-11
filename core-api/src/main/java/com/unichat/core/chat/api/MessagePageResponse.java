package com.unichat.core.chat.api;

import java.util.List;

/** Stable latest-first pages, with messages ordered chronologically within each page. */
public record MessagePageResponse(List<MessageResponse> content, int number, int size,
        long totalElements, int totalPages, long snapshotSequence) { }
