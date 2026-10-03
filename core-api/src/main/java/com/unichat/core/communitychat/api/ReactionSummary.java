package com.unichat.core.communitychat.api;

import java.util.List;
import java.util.Map;

import com.unichat.core.communitychat.domain.ReactionType;

/**
 * Reactions on one target: how many of each kind, and which one the current
 * user left.
 *
 * @param counts      reaction type to count, omitting types nobody used
 * @param total       every reaction regardless of type
 * @param myReaction  the current user's reaction, null when they left none
 */
public record ReactionSummary(
        Map<ReactionType, Long> counts,
        long total,
        ReactionType myReaction
) {
    public static ReactionSummary empty() {
        return new ReactionSummary(Map.of(), 0, null);
    }

    /**
     * Builds a summary from per-type counts.
     *
     * @param entries    reaction type to count
     * @param myReaction the current user's reaction, may be null
     */
    public static ReactionSummary of(Map<ReactionType, Long> entries, ReactionType myReaction) {
        long total = entries.values().stream().mapToLong(Long::longValue).sum();
        return new ReactionSummary(entries, total, myReaction);
    }

    /** Reaction types in display order, so every client agrees on the order. */
    public static List<ReactionType> displayOrder() {
        return List.of(ReactionType.LIKE, ReactionType.LOVE,
                ReactionType.INSIGHTFUL, ReactionType.CELEBRATE);
    }
}
