package com.unichat.core.communitychat.domain;

import java.util.UUID;

public record NewReplyEvent(
        UUID workspaceId,
        UUID discussionId,
        UUID replyAuthorId,
        UUID discussionAuthorId,
        UUID replyId
) {}
