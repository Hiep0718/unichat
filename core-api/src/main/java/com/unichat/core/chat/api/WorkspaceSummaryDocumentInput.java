package com.unichat.core.chat.api;

import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** One completed document summary and its original chunk provenance. */
public record WorkspaceSummaryDocumentInput(
        @NotNull UUID documentId,
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank @Size(max = 12000) String summary,
        @Size(max = 30) List<String> topics,
        @NotEmpty @Size(max = 100) List<@Valid WorkspaceSummaryClaimInput> claims,
        @Positive int processedChunkCount,
        @NotEmpty List<@Valid WorkspaceSummarySourceInput> sources) { }
