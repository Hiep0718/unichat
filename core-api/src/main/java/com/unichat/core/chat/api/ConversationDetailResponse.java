package com.unichat.core.chat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.unichat.core.chat.domain.Conversation;

/**
 * Detail response payload representing a conversation and its message history.
 */
public record ConversationDetailResponse(
        UUID id,
        UUID workspaceId,
        UUID userId,
        String title,
        String status,
        List<MessageResponse> messages,
        Instant createdAt,
        Instant updatedAt
) {
    public static ConversationDetailResponse from(Conversation c, List<MessageResponse> messages) {
        return new ConversationDetailResponse(
                c.getId(),
                c.getWorkspaceId(),
                c.getUserId(),
                c.getTitle(),
                c.getStatus(),
                messages,
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
