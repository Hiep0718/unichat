package com.unichat.core.chat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Authenticated heartbeat for an active workspace summary worker. */
public record WorkspaceSummaryHeartbeatRequest(@NotBlank @Size(max = 100) String requestId) { }
