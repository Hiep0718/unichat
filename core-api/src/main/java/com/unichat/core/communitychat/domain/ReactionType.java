package com.unichat.core.communitychat.domain;

import java.util.Arrays;

/**
 * The reactions a member can leave on a post or reply.
 *
 * <p>All of them are positive. Downvoting was removed: in a group where
 * everyone knows each other it carries a social cost, and at class scale a
 * handful of votes ranks nothing reliably.
 */
public enum ReactionType {
    LIKE,
    LOVE,
    INSIGHTFUL,
    CELEBRATE;

    /**
     * Parses a client-supplied reaction name.
     *
     * @throws IllegalArgumentException when the name is not a known reaction
     */
    public static ReactionType parse(String raw) {
        return Arrays.stream(values())
                .filter(type -> type.name().equalsIgnoreCase(raw))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Loại cảm xúc không hợp lệ: " + raw));
    }
}
