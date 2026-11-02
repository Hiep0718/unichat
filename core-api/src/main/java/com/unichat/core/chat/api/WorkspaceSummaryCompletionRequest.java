package com.unichat.core.chat.api;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Complete result returned by the private AI worker after full source validation. */
public record WorkspaceSummaryCompletionRequest(
        @NotBlank @Size(max = 100) String requestId,
        @NotBlank @Size(max = 128) String sourceFingerprint,
        @NotBlank @Size(max = 12000) String overview,
        @NotEmpty @Size(max = 200) List<@NotBlank String> overviewChunkIds,
        @NotNull @Size(max = 100) List<@Valid WorkspaceSummaryInsightInput> crossDocumentInsights,
        @NotEmpty List<@Valid WorkspaceSummaryDocumentInput> documents,
        @Positive long processedChunkCount) { }
