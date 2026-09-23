package com.unichat.core.user.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What one member may see about another.
 *
 * <p>Everything here is scoped to the groups the two share, so a profile never
 * reveals where someone is a member outside the viewer's own reach. Viewing
 * your own profile scopes to all of your groups, which is the same rule.
 *
 * @param handle        what to type to mention them, derived from their email
 * @param sharedGroups  groups both people belong to, with the subject's role
 * @param contributions counted within those same groups
 * @param topTags       tags on questions they have answered, most frequent first
 * @param canMessage    whether Work Chat will let the viewer open a conversation
 * @param self          whether the viewer is looking at their own profile
 */
public record MemberProfile(
        UUID userId,
        String displayName,
        String handle,
        boolean hasAvatar,
        String avatarColor,
        Instant joinedAt,
        List<SharedGroup> sharedGroups,
        Contributions contributions,
        List<String> topTags,
        boolean canMessage,
        boolean self
) {

    /**
     * A group both people belong to.
     *
     * @param role the subject's role in it, so "owns this group" is visible
     */
    public record SharedGroup(UUID workspaceId, String name, String role) {}

    /**
     * What the member has added to the shared groups.
     *
     * @param documentsContributed files they submitted to a group library
     * @param documentsApproved    of those, the ones the assistant can now cite
     * @param postsWritten         questions and discussions they started
     * @param repliesWritten       replies they posted
     * @param answersAccepted      replies an asker marked as the answer
     */
    public record Contributions(
            long documentsContributed,
            long documentsApproved,
            long postsWritten,
            long repliesWritten,
            long answersAccepted
    ) {
        public static Contributions none() {
            return new Contributions(0, 0, 0, 0, 0);
        }
    }
}
