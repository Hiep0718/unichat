package com.unichat.core.workchat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.unichat.core.workchat.domain.DirectMessage;

/**
 * A message as returned to clients.
 *
 * @param body        null in a message that is only files
 * @param mine        whether the caller sent it, so the UI need not compare ids
 * @param attachments files sent with it, oldest first; empty for a text message
 */
public record MessageResponse(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String senderName,
        String body,
        boolean mine,
        Instant createdAt,
        Instant readAt,
        List<ChatAttachmentResponse> attachments
) {
    /** A message known to have no files, such as one just sent as text. */
    public static MessageResponse from(DirectMessage message, String senderName, UUID callerId) {
        return from(message, senderName, callerId, List.of());
    }

    public static MessageResponse from(DirectMessage message, String senderName, UUID callerId,
                                       List<ChatAttachmentResponse> attachments) {
        return new MessageResponse(
                message.getId(),
                message.getConversationId(),
                message.getSenderId(),
                senderName,
                message.getBody(),
                message.getSenderId().equals(callerId),
                message.getCreatedAt(),
                message.getReadAt(),
                attachments);
    }
}
