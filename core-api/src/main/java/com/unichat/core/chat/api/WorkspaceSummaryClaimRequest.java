package com.unichat.core.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Content-free worker claim binding for a queued summary operation. */
public record WorkspaceSummaryClaimRequest(
        @NotBlank @Size(max = 100) String requestId,
        @NotBlank @Size(max = 128) String sourceFingerprint) { }
