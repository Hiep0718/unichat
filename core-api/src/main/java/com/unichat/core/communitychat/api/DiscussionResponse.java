package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.communitychat.domain.Discussion;

public record DiscussionResponse(
        UUID id,
        UUID workspaceId,
        UUID authorId,
        String title,
        String body,
        String label,
        boolean pinned,
        String status,
        int viewCount,
        int replyCount,
        Instant createdAt,
        Instant updatedAt,
        String authorName,
        String authorAvatar
) {
    public static DiscussionResponse from(Discussion d, String authorName, String authorAvatar) {
        return new DiscussionResponse(
                d.getId(), d.getWorkspaceId(), d.getAuthorId(), d.getTitle(),
                d.getBody(), d.getLabel(), d.isPinned(), d.getStatus(),
                d.getViewCount(), d.getReplyCount(), d.getCreatedAt(), d.getUpdatedAt(),
                authorName, authorAvatar
        );
    }
}
