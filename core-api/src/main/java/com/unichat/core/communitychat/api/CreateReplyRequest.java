package com.unichat.core.communitychat.api;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;

public record CreateReplyRequest(
        @NotBlank(message = "Body is required")
        String body,

        UUID parentReplyId
) {}
