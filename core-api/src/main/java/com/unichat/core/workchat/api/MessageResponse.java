package com.unichat.core.workchat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.unichat.core.workchat.domain.DirectMessage;

/**
 * A message as returned to clients.
 *
 * <p>Carries no read state. In a group that is a fact about each participant
 * rather than about the message, and it is held as a watermark on the
 * participant row; the conversation list turns those into an unread count,
 * which is the only form the UI shows (V31).
 *
 * @param body        null in a message that is only files
 * @param senderName  shown on other people's bubbles in a group
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
                attachments);
    }
}
