package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.communitychat.domain.CommunityMessage;
import com.unichat.core.communitychat.domain.MessageAuthorType;

/**
 * Response DTO for a community message.
 */
public record MessageResponse(
        UUID id,
        UUID channelId,
        UUID authorId,
        MessageAuthorType authorType,
        String content,
        UUID replyToId,
        boolean mentionsAi,
        Instant createdAt,
        String authorName, // Transient field to be populated by service
        String authorAvatar // Transient field to be populated by service
) {
    public static MessageResponse from(CommunityMessage message, String authorName, String authorAvatar) {
        return new MessageResponse(
                message.getId(),
                message.getChannelId(),
                message.getAuthorId(),
                message.getAuthorType(),
                message.getContent(),
                message.getReplyToId(),
                message.isMentionsAi(),
                message.getCreatedAt(),
                authorName,
                authorAvatar
        );
    }
}
