package com.unichat.core.communitychat.domain;

import java.util.UUID;

/**
 * Raised when a reply names {@code @AI}, so the assistant answers it.
 *
 * <p>Carries identifiers rather than entities: the handler runs on another
 * thread in its own transaction, where a detached entity would be stale.
 *
 * @param workspaceId     group the post belongs to, used to scope retrieval
 * @param discussionId    post being answered
 * @param triggerReplyId  reply that named the assistant; the answer replies to it
 * @param discussionTitle post title, used as context for a terse question
 * @param triggerBody     raw reply text, still carrying the {@code @AI} handle
 */
public record AiMentionEvent(
        UUID workspaceId,
        UUID discussionId,
        UUID triggerReplyId,
        String discussionTitle,
        String triggerBody
) {}
