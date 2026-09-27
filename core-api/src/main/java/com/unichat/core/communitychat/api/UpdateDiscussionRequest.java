package com.unichat.core.communitychat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for editing an existing post.
 *
 * <p>The label is not editable: changing a discussion into an announcement
 * would bypass the role check applied when the post was created.
 */
public record UpdateDiscussionRequest(
        @NotBlank(message = "Tiêu đề là bắt buộc")
        @Size(max = 200, message = "Tiêu đề không được vượt quá 200 ký tự")
        String title,

        @NotBlank(message = "Nội dung là bắt buộc")
        String body,

        /** Colour preset behind a short post; null clears it. */
        @Size(max = 24)
        String backgroundKey
) {}
