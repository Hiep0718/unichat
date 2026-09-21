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
        /** Set once the author has edited the post, null otherwise. */
        Instant editedAt,
        int voteScore,
        String authorName,
        String authorAvatar,
        List<String> tags,
        UUID acceptedReplyId,
        List<PostAttachmentResponse> attachments,
        /** Counts per reaction type plus the caller's own choice. */
        ReactionSummary reactions
) {
    public static DiscussionResponse from(Discussion d, String authorName, String authorAvatar) {
        return from(d, null, authorName, authorAvatar, List.of(), ReactionSummary.empty());
    }

    /**
     * Maps a discussion including the workspace it belongs to and its files.
     *
     * @param workspaceName owning workspace name, null when not resolved
     * @param attachments   files attached to the post, never null
     * @param reactions     reaction counts, never null
     */
    public static DiscussionResponse from(Discussion d, String workspaceName, String authorName,
                                          String authorAvatar,
                                          List<PostAttachmentResponse> attachments,
                                          ReactionSummary reactions) {
        return new DiscussionResponse(
                d.getId(), d.getWorkspaceId(), workspaceName, d.getAuthorId(), d.getTitle(),
                d.getBody(), d.getLabel(), d.isPinned(), d.getStatus(),
                d.getViewCount(), d.getReplyCount(), d.getCreatedAt(), d.getUpdatedAt(),
                d.getEditedAt(), d.getVoteScore(),
                authorName, authorAvatar,
                d.getTags(), d.getAcceptedReplyId(), attachments,
                reactions == null ? ReactionSummary.empty() : reactions
        );
    }
}
