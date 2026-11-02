package com.unichat.core.chat.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** One durable, source-bound document summary checkpoint. */
public record WorkspaceSummaryCheckpointRequest(
        @NotBlank @Size(max = 100) String requestId,
        @NotBlank @Size(max = 128) String sourceFingerprint,
        @NotNull @Valid WorkspaceSummaryDocumentInput document) { }
