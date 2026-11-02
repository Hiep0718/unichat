package com.unichat.core.chat.domain;

import java.time.Instant;
import java.util.UUID;
import com.unichat.core.chat.api.ChatTaskType;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatSourceSnapshot;

/** Immutable durable operation snapshot, including the original retry binding. */
public record ChatOperation(UUID id, ChatActor actor, UUID key, String bindingHash,
        UUID workspaceId, UUID originalConversationId, UUID conversationId, UUID userMessageId,
        UUID resultMessageId, String question, boolean expanded, ChatTaskType taskType, String requestId, String state,
        ChatSourceSnapshot sources, String errorCode, Instant deadlineAt, Instant leaseUntil, Instant expiresAt) {
    /** Preserves existing question operation construction while task type rolls out. */
    public ChatOperation(UUID id, ChatActor actor, UUID key, String bindingHash,
            UUID workspaceId, UUID originalConversationId, UUID conversationId, UUID userMessageId,
            UUID resultMessageId, String question, boolean expanded, String requestId, String state,
            ChatSourceSnapshot sources, String errorCode, Instant deadlineAt, Instant leaseUntil, Instant expiresAt) {
        this(id, actor, key, bindingHash, workspaceId, originalConversationId, conversationId, userMessageId,
                resultMessageId, question, expanded, ChatTaskType.QUESTION, requestId, state, sources,
                errorCode, deadlineAt, leaseUntil, expiresAt);
    }
}
