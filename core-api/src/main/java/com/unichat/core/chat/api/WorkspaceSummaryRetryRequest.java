package com.unichat.core.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Content-free delayed retry intent for an active summary job. */
public record WorkspaceSummaryRetryRequest(@NotBlank @Size(max = 100) String requestId,
        int delaySeconds) { }
