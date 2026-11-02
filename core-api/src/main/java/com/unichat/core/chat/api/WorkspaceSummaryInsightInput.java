package com.unichat.core.chat.api;

import java.util.List;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Cross-document insight with document IDs and supporting chunks. */
public record WorkspaceSummaryInsightInput(
        @NotBlank @Size(max = 2000) String text,
        @NotEmpty @Size(min = 2, max = 100) List<@NotNull UUID> documentIds,
        @NotEmpty @Size(min = 2, max = 200) List<@NotBlank String> chunkIds) { }
