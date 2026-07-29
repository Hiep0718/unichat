package com.unichat.core.chat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.chat.domain.Conversation;

/**
 * Response payload representing a conversation session.
 */
public record ConversationResponse(
        UUID id,
        UUID workspaceId,
        UUID userId,
        String title,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static ConversationResponse from(Conversation c) {
        return new ConversationResponse(
                c.getId(),
                c.getWorkspaceId(),
                c.getUserId(),
                c.getTitle(),
                c.getStatus(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
