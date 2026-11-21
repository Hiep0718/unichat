package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.ReplyCitation;

public record ReplyResponse(
        UUID id,
        UUID discussionId,
        UUID authorId,
        String body,
        UUID parentReplyId,
        boolean isAiAnswer,
        Instant createdAt,
        int voteScore,
        String authorName,
        /** Always null; kept for older clients. Use {@code authorHasAvatar}. */
        String authorAvatar,
        /** Whether the author uploaded a picture the client can fetch. */
        boolean authorHasAvatar,
        /** The colour key the author chose, or null to derive one from the name. */
        String authorAvatarColor,
        /** Counts per reaction type plus the caller's own choice. */
        ReactionSummary reactions,
        /** Sources behind an AI answer; empty for a human reply. */
        List<ReplyCitation> citations
) {
    /**
     * Builds the response for one reply.
     *
     * @param r         the stored reply
     * @param author    who wrote it, as a reader should see them
     * @param reactions counts and the caller's own reaction; null means none
     * @return the reply as the API returns it
     */
    public static ReplyResponse from(DiscussionReply r, ReplyAuthor author, ReactionSummary reactions) {
        return new ReplyResponse(
                r.getId(), r.getDiscussionId(), r.getAuthorId(), r.getBody(),
                r.getParentReplyId(), r.isAiAnswer(), r.getCreatedAt(),
                r.getVoteScore(),
                author.name(), null, author.hasAvatar(), author.avatarColor(),
                reactions == null ? ReactionSummary.empty() : reactions,
                r.getCitations()
        );
    }
}
