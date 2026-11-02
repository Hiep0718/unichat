package com.unichat.core.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Content-free worker progress counters. */
public record WorkspaceSummaryProgressRequest(
        @NotBlank @Size(max = 100) String requestId,
        @NotBlank @Size(max = 32) String stage,
        @PositiveOrZero int documentsCompleted,
        @PositiveOrZero long chunksProcessed,
        @PositiveOrZero int providerCallsCompleted) { }
