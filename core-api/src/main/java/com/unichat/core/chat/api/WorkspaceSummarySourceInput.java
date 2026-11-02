package com.unichat.core.chat.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Verified chunk provenance carried from the source-complete AI worker. */
public record WorkspaceSummarySourceInput(
        @NotBlank String chunkId,
        @NotBlank @Size(max = 120) String locator,
        @NotBlank @Size(max = 1200) String excerpt,
        @NotBlank @Size(min = 64, max = 64) String contentHash,
        @Min(1) int ingestionVersion) { }
