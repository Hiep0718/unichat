package com.unichat.core.workchat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.workchat.domain.DirectMessage;

/**
 * A message as returned to clients.
 *
 * @param mine whether the caller sent it, so the UI need not compare ids itself
 */
public record MessageResponse(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String senderName,
        String body,
        boolean mine,
        Instant createdAt,
        Instant readAt
) {
    public static MessageResponse from(DirectMessage message, String senderName, UUID callerId) {
        return new MessageResponse(
                message.getId(),
                message.getConversationId(),
                message.getSenderId(),
                senderName,
                message.getBody(),
                message.getSenderId().equals(callerId),
                message.getCreatedAt(),
                message.getReadAt());
    }
}
