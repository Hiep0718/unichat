package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.unichat.core.communitychat.domain.Discussion;

/**
 * Response DTO for a single discussion thread.
 */
public record DiscussionResponse(
        UUID id,
        UUID workspaceId,
        /** Name of the owning workspace, for the post header. */
        String workspaceName,
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
        int voteScore,
        String userVote,
        String authorName,
        String authorAvatar,
        List<String> tags,
        UUID acceptedReplyId
) {
    public static DiscussionResponse from(Discussion d, String authorName, String authorAvatar, String userVote) {
        return from(d, null, authorName, authorAvatar, userVote);
    }

    /**
     * Maps a discussion including the workspace it belongs to.
     *
     * @param workspaceName owning workspace name, null when not resolved
     */
    public static DiscussionResponse from(Discussion d, String workspaceName, String authorName,
                                          String authorAvatar, String userVote) {
        return new DiscussionResponse(
                d.getId(), d.getWorkspaceId(), workspaceName, d.getAuthorId(), d.getTitle(),
                d.getBody(), d.getLabel(), d.isPinned(), d.getStatus(),
                d.getViewCount(), d.getReplyCount(), d.getCreatedAt(), d.getUpdatedAt(),
                d.getVoteScore(), userVote,
                authorName, authorAvatar,
                d.getTags(), d.getAcceptedReplyId()
        );
    }
}

