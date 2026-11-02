package com.unichat.core.communitychat.domain;

import java.util.Arrays;

/**
 * The reactions a member can leave on a post or reply.
 *
 * <p>The set Facebook uses, chosen so nobody has to be taught what the icons
 * mean. That is a change of position, not an oversight: V17 had removed
 * downvoting and left four positive reactions, reasoning that a negative
 * reaction in a group where everyone knows each other carries a social cost.
 * {@link #SAD} and {@link #ANGRY} bring that cost back, and on a board where
 * people post because the assistant could not help them, an angry face under a
 * question is the kind of thing that stops the next person asking. The trade
 * was made knowingly; see ADR-026.
 *
 * <p>Order here is display order on every client, and matches Facebook's.
 */
public enum ReactionType {
    LIKE,
    LOVE,
    /** Facebook's "thương thương"; also where CELEBRATE was mapped in V42. */
    CARE,
    HAHA,
    /** Also where INSIGHTFUL was mapped in V42. */
    WOW,
    SAD,
    ANGRY;

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
