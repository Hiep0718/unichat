package com.unichat.core.workchat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.unichat.core.workchat.domain.ConversationKind;

/**
 * One row in the conversation list.
 *
 * <p>{@code title} is filled for both kinds — the group's name, or the other
 * person's display name — so the list renders a row the same way whichever it
 * is, and only the avatars differ.
 *
 * @param otherUserId   the person on the other side; null in a group, where
 *                      there is no single other person
 * @param participants  everyone in it, for the avatars and the members panel
 * @param lastMessage   preview of the newest message, null in an empty thread
 * @param lastMessageAt when that message arrived, null in an empty thread
 * @param unreadCount   messages from other people since the caller's watermark
 */
public record ConversationSummary(
        UUID id,
        ConversationKind kind,
        String title,
        UUID otherUserId,
        List<ParticipantSummary> participants,
        String lastMessage,
        Instant lastMessageAt,
        long unreadCount
) {}
