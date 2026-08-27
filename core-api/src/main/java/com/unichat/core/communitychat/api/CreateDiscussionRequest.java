package com.unichat.core.communitychat.api;

import java.util.List;

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

        @Size(max = 5, message = "Maximum 5 tags allowed")
        List<String> tags
) {}

