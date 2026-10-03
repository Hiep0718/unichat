package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.UUID;

/**
 * Raised when a post or reply mentions members, so they can be notified
 * outside the request that created it.
 *
 * @param mentionedUserIds members named in the text, excluding the author
 * @param replyId          reply carrying the mention, null when it is a post
 */
public record MentionEvent(
        UUID workspaceId,
        UUID discussionId,
        UUID replyId,
        UUID authorId,
        List<UUID> mentionedUserIds
) {}
