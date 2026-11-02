package com.unichat.core.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Content-free terminal failure report from the summary worker. */
public record WorkspaceSummaryFailureRequest(
        @NotBlank @Size(max = 100) String requestId,
        @NotBlank @Pattern(regexp = "SUMMARY_INCOMPLETE|SUMMARY_SOURCE_SNAPSHOT_CHANGED|SUMMARY_PROCESSING_FAILED|RETRIEVAL_UNAVAILABLE")
        String errorCode) { }
