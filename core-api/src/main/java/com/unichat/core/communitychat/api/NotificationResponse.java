package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.communitychat.domain.Notification;

public record NotificationResponse(
        UUID id,
        String type,
        UUID workspaceId,
        String payload,
        boolean isRead,
        Instant createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getWorkspaceId(),
                notification.getPayload(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
