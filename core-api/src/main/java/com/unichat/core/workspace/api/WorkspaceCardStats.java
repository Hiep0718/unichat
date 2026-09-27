package com.unichat.core.workspace.api;

import java.util.List;
import java.util.UUID;

/**
 * What a group's card shows beyond its name.
 *
 * <p>A card used to carry only counts, which made every card look alike. Faces
 * and recent activity are what distinguish a group someone should open from one
 * that has been quiet for a month.
 *
 * @param documentCount   non-deleted documents in the group's library
 * @param memberCount     active members
 * @param recentPostCount posts in the last week, so "quiet" is visible
 * @param faces           a few members to show, owners first
 */
public record WorkspaceCardStats(
        long documentCount,
        long memberCount,
        long recentPostCount,
        List<MemberFace> faces
) {

    /** A group with nothing counted yet, used where no page context exists. */
    public static WorkspaceCardStats empty() {
        return new WorkspaceCardStats(0, 0, 0, List.of());
    }

    /**
     * One member's identity as a card shows it.
     *
     * @param hasAvatar   whether to fetch a picture or draw the letter avatar
     * @param avatarColor chosen letter-avatar colour, null to derive from name
     */
    public record MemberFace(
            UUID userId,
            String displayName,
            boolean hasAvatar,
            String avatarColor
    ) {}
}
