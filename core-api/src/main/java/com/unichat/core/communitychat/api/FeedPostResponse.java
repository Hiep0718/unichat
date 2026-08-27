package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Feed post projection returned by the feed API.
 */
public record FeedPostResponse(
    UUID id,
    UUID workspaceId,
    String workspaceName,
    UUID authorId,
    String authorName,
    String authorAvatar,
    String title,
    String body,
    String label,
    int voteScore,
    int replyCount,
    String userVote,
    List<String> tags,
    boolean hasAcceptedAnswer,
    boolean isBookmarked,
    Instant createdAt
) {}

