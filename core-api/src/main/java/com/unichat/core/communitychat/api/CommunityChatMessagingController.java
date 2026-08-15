package com.unichat.core.communitychat.api;

import java.security.Principal;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import com.unichat.core.communitychat.service.CommunityMessagingService;

import jakarta.validation.Valid;

/**
 * Handles incoming STOMP messages for real-time community chat.
 */
@Controller
public class CommunityChatMessagingController {

    private static final Logger log = LoggerFactory.getLogger(CommunityChatMessagingController.class);
    
    private final CommunityMessagingService messagingService;

    public CommunityChatMessagingController(CommunityMessagingService messagingService) {
        this.messagingService = messagingService;
    }

    /**
     * Receives messages sent to /app/workspaces/{workspaceId}/chat
     * Validates membership, saves the message, broadcasts it, and triggers AI if mentioned.
     */
    @MessageMapping("/workspaces/{workspaceId}/chat")
    public void handleChatMessage(
            @DestinationVariable UUID workspaceId,
            @Valid @Payload SendMessagePayload payload,
            Principal principal) {
        
        if (principal == null) {
            log.warn("Received message without principal for workspace {}", workspaceId);
            return;
        }

        UUID userId = UUID.fromString(principal.getName());
        
        log.debug("Received chat message from user {} in workspace {}: {}", userId, workspaceId, payload.content());
        
        // Delegate to service to handle persistence, broadcasting, and AI triggering
        messagingService.processAndBroadcastMessage(workspaceId, userId, payload);
    }
}
