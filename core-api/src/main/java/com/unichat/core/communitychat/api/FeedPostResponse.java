package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.UUID;

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
    Instant createdAt
) {}
