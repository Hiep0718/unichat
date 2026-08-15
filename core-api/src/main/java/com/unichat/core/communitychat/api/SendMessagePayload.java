package com.unichat.core.communitychat.api;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Payload sent by a client to send a chat message via WebSocket.
 */
public record SendMessagePayload(
        @NotNull(message = "channelId is required")
        UUID channelId,
        
        @NotBlank(message = "content is required")
        @Size(max = 2000, message = "content cannot exceed 2000 characters")
        String content,
        
        UUID replyToId
) {}
