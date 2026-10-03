package com.unichat.core.communitychat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for creating a new discussion post.
 */
public record CreateDiscussionRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title cannot exceed 200 characters")
        String title,

        @NotBlank(message = "Body is required")
        String body,

        @Size(max = 20)
        String label,

        /** Colour preset behind a short post; null for an ordinary one. */
        @Size(max = 24)
        String backgroundKey
) {}

