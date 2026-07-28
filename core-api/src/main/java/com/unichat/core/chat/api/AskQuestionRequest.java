package com.unichat.core.chat.api;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload for asking a question in a workspace.
 */
public record AskQuestionRequest(
        @NotBlank(message = "Câu hỏi không được để trống")
        @Size(min = 3, max = 2000, message = "Câu hỏi phải từ 3 đến 2.000 ký tự")
        String question,

        UUID conversationId
) {}
