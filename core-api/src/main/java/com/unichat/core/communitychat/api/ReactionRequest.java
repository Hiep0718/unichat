package com.unichat.core.communitychat.api;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReactionRequest(
        @NotBlank(message = "targetType is required")
        String targetType,

        @NotNull(message = "targetId is required")
        UUID targetId,

        @NotBlank(message = "reactionType is required")
        String reactionType
) {}
