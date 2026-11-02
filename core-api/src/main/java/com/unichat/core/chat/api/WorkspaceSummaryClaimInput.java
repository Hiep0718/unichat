package com.unichat.core.chat.api;

import java.util.List;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** A source-backed statement in a per-document summary. */
public record WorkspaceSummaryClaimInput(
        @NotBlank @Size(max = 2000) String text,
        @NotEmpty @Size(max = 100) List<@NotBlank String> chunkIds) { }
