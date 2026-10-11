package com.unichat.core.chat.service;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import com.unichat.core.chat.api.AskQuestionRequest;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.shared.servicesecurity.RequestBinding;

/** Original request binding never substitutes a server-created conversation ID. */
public record ChatBinding(UUID workspaceId, UUID conversationId, String question, boolean expanded) {
    /** Normalizes surrounding question whitespace and retains mode on the turn. */
    public static ChatBinding from(UUID workspaceId, AskQuestionRequest request) {
        String question = request.question().strip();
        if (question.length() < 3 || question.length() > 2000) throw new ValidationError("Câu hỏi phải từ 3 đến 2.000 ký tự.");
        return new ChatBinding(workspaceId, request.conversationId(), question, Boolean.TRUE.equals(request.allowExternalKnowledge()));
    }
    /** Hashes a deterministic binding representation using the shared mapper. */
    public String hash(ChatJson json) { return RequestBinding.hash(json.write(this).getBytes(StandardCharsets.UTF_8)); }
}
