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
        /** Colour preset behind the post, null for an ordinary one. */
        String backgroundKey,
        UUID acceptedReplyId,
        List<PostAttachmentResponse> attachments,
        /** Counts per reaction type plus the caller's own choice. */
        ReactionSummary reactions,
        /**
         * Whether the group's assistant has replied to this post.
         *
         * <p>The post list draws a marker from this, so the reader can tell an
         * answered question from an open one without opening it.
         */
        boolean hasAiAnswer
) {
    /**
     * Maps a discussion with no workspace name, files or reactions resolved.
     *
     * @param hasAiAnswer whether the assistant has replied; the caller must
     *                    establish this, because a response that reports a
     *                    marker it never looked up is a response that lies
     */
    public static DiscussionResponse from(Discussion d, String authorName, String authorAvatar,
                                          boolean hasAiAnswer) {
        return from(d, null, authorName, authorAvatar, List.of(), ReactionSummary.empty(),
                hasAiAnswer);
    }

    /**
     * Maps a discussion including the workspace it belongs to and its files.
     *
     * @param workspaceName owning workspace name, null when not resolved
     * @param attachments   files attached to the post, never null
     * @param reactions     reaction counts, never null
     * @param hasAiAnswer   whether the assistant has replied to this post
     */
    public static DiscussionResponse from(Discussion d, String workspaceName, String authorName,
                                          String authorAvatar,
                                          List<PostAttachmentResponse> attachments,
                                          ReactionSummary reactions,
                                          boolean hasAiAnswer) {
        return new DiscussionResponse(
                d.getId(), d.getWorkspaceId(), workspaceName, d.getAuthorId(), d.getTitle(),
                d.getBody(), d.getLabel(), d.isPinned(), d.getStatus(),
                d.getViewCount(), d.getReplyCount(), d.getCreatedAt(), d.getUpdatedAt(),
                d.getEditedAt(), d.getVoteScore(),
                authorName, authorAvatar,
                d.getBackgroundKey(), d.getAcceptedReplyId(), attachments,
                reactions == null ? ReactionSummary.empty() : reactions,
                hasAiAnswer
        );
    }
}
