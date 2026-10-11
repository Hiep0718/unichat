package com.unichat.core.admin.api;

import java.time.Instant;
import java.util.UUID;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Private metadata contract; never accepts prompts, answer text or source excerpts. */
public record ProviderAttemptRequest(
        @NotNull UUID attemptId,
        UUID operationId,
        @NotBlank @Pattern(regexp = "CHAT|COMPACTION|ADMIN_PROMPT|KEY_PROBE") String purpose,
        @NotBlank @Size(max = 40) String provider,
        @NotBlank @Size(max = 100) String keyId,
        @NotBlank @Size(max = 100) String model,
        @NotBlank @Pattern(regexp = "START|END") String phase,
        @Pattern(regexp = "SUCCESS|ERROR|CANCELLED") String outcome,
        @NotNull Instant occurredAt,
        @PositiveOrZero Long latencyMs,
        @PositiveOrZero Long inputTokens,
        @PositiveOrZero Long outputTokens,
        @Size(max = 80) @Pattern(regexp = "[A-Z0-9_]+") String errorCode
) { }
