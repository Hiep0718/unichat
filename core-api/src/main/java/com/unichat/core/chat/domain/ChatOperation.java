package com.unichat.core.chat.domain;

import java.time.Instant;
import java.util.UUID;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatSourceSnapshot;

/** Immutable durable operation snapshot, including the original retry binding. */
public record ChatOperation(UUID id, ChatActor actor, UUID key, String bindingHash,
        UUID workspaceId, UUID originalConversationId, UUID conversationId, UUID userMessageId,
        UUID resultMessageId, String question, boolean expanded, String requestId, String state,
        ChatSourceSnapshot sources, String errorCode, Instant deadlineAt, Instant leaseUntil, Instant expiresAt) { }
