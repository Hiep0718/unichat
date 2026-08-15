package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.communitychat.domain.DiscussionReply;

public record ReplyResponse(
        UUID id,
        UUID discussionId,
        UUID authorId,
        String body,
        UUID parentReplyId,
        boolean isAiAnswer,
        Instant createdAt,
        String authorName,
        String authorAvatar
) {
    public static ReplyResponse from(DiscussionReply r, String authorName, String authorAvatar) {
        return new ReplyResponse(
                r.getId(), r.getDiscussionId(), r.getAuthorId(), r.getBody(),
                r.getParentReplyId(), r.isAiAnswer(), r.getCreatedAt(),
                authorName, authorAvatar
        );
    }
}
