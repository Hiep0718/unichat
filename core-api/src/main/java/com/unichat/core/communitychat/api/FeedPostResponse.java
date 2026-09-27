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
    /** Counts per reaction type plus the caller's own choice. */
    ReactionSummary reactions,
    /** Colour preset behind the post, null for an ordinary one. */
    String backgroundKey,
    boolean hasAcceptedAnswer,
    boolean isBookmarked,
    Instant createdAt,
    /** Files attached to the post, so the card can preview images. */
    List<PostAttachmentResponse> attachments
) {}

