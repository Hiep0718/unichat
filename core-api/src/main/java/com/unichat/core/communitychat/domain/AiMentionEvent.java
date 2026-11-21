package com.unichat.core.communitychat.domain;

import java.util.UUID;

import com.unichat.core.chat.service.ChatActor;

/**
 * Raised when a reply names {@code @AI}, so the assistant answers it.
 *
 * <p>Carries identifiers rather than entities: the handler runs on another
 * thread in its own transaction, where a detached entity would be stale. The
 * asker travels with the session that posted the comment, so the answer is
 * authorized exactly like a question typed into the AI assistant: a revoked
 * session or membership stops it.
 *
 * @param workspaceId     group the post belongs to, used to scope retrieval
 * @param discussionId    post being answered
 * @param triggerReplyId  reply that named the assistant; the answer replies to it
 * @param discussionTitle post title, used as context for a terse question
 * @param triggerBody     raw reply text, still carrying the {@code @AI} handle
 * @param asker           who asked, with the session captured when they posted
 */
public record AiMentionEvent(
        UUID workspaceId,
        UUID discussionId,
        UUID triggerReplyId,
        String discussionTitle,
        String triggerBody,
        ChatActor asker
) {}
