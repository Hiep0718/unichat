package com.unichat.core.workspace.api;

import java.util.List;
import java.util.UUID;

import com.unichat.core.workspace.domain.WorkspaceTopic;

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
 * @param postCount       every live post, however old; the tab badge beside
 *                        "Bài viết" claims this, not the recent count
 * @param faces           a few members to show, owners first
 * @param topics          what the group is about; empty for groups created
 *                        before topics existed, which is why nothing treats
 *                        an empty list as a problem
 */
public record WorkspaceCardStats(
        long documentCount,
        long memberCount,
        long recentPostCount,
        long postCount,
        List<MemberFace> faces,
        List<WorkspaceTopic> topics
) {

    /** A group with nothing counted yet, used where no page context exists. */
    public static WorkspaceCardStats empty() {
        return new WorkspaceCardStats(0, 0, 0, 0, List.of(), List.of());
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
