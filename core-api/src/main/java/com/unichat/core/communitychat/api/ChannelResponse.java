package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.communitychat.domain.CommunityChannel;

/**
 * Response DTO for a community channel.
 */
public record ChannelResponse(
        UUID id,
        UUID workspaceId,
        String name,
        String description,
        Instant createdAt
) {
    public static ChannelResponse from(CommunityChannel channel) {
        return new ChannelResponse(
                channel.getId(),
                channel.getWorkspaceId(),
                channel.getName(),
                channel.getDescription(),
                channel.getCreatedAt()
        );
    }
}
