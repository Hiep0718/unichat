package com.unichat.core.chat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.unichat.core.chat.domain.Message;

/**
 * Response payload representing a message in a conversation.
 */
public record MessageResponse(
        UUID id,
        UUID conversationId,
        String role,
        String content,
        String intent,
        String refusalCode,
        String providerModel,
        Instant createdAt,
        List<CitationResponse> citations
) {
    public static MessageResponse from(Message m) {
        return from(m, List.of());
    }

    public static MessageResponse from(Message m, List<CitationResponse> citations) {
        return new MessageResponse(
                m.getId(),
                m.getConversationId(),
                m.getRole(),
                m.getContent(),
                m.getIntent(),
                m.getRefusalCode(),
                m.getProviderModel(),
                m.getCreatedAt(),
                citations != null ? citations : List.of()
        );
    }
}

