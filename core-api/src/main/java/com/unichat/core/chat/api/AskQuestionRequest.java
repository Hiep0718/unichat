package com.unichat.core.chat.api;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Payload for asking a question in a workspace.
 *
 * <p>{@code taskType} is optional. When omitted, Core infers the task from the question: a
 * collection-wide summary request is routed to the workspace summary pipeline when enabled,
 * every other question is answered by adaptive retrieval.</p>
 */
public record AskQuestionRequest(
        @NotBlank(message = "Câu hỏi không được để trống")
        @Size(min = 3, max = 2000, message = "Câu hỏi phải từ 3 đến 2.000 ký tự")
        String question,

        UUID conversationId,

        Boolean allowExternalKnowledge,

        ChatTaskType taskType
) {
    /** Preserves existing callers while allowing an explicit summary request. */
    public AskQuestionRequest(String question, UUID conversationId, Boolean allowExternalKnowledge) {
        this(question, conversationId, allowExternalKnowledge, ChatTaskType.QUESTION);
    }
}
