package com.unichat.core.workchat.api;

import java.time.Instant;
import java.util.UUID;

/**
 * One row in the conversation list.
 *
 * @param otherUserId   the person on the other side, as seen by the caller
 * @param otherUserName their display name
 * @param lastMessage   preview of the newest message, null in an empty thread
 * @param lastMessageAt when that message arrived, null in an empty thread
 * @param unreadCount   messages from the other person the caller has not read
 */
public record ConversationSummary(
        UUID id,
        UUID otherUserId,
        String otherUserName,
        String lastMessage,
        Instant lastMessageAt,
        long unreadCount
) {}
