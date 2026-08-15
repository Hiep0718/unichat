package com.unichat.core.communitychat.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.communitychat.service.CommunityChatService;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/channels/{channelId}/messages")
public class CommunityMessageController {

    private final CommunityChatService chatService;

    public CommunityMessageController(CommunityChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public ResponseEntity<List<MessageResponse>> getRecentMessages(
            @PathVariable UUID workspaceId,
            @PathVariable UUID channelId,
            @RequestParam(defaultValue = "50") int limit,
            @AuthenticationPrincipal Jwt jwt) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        // Maximum limit is 100 to prevent large queries
        int safeLimit = Math.min(limit, 100);
        List<MessageResponse> messages = chatService.getRecentMessages(workspaceId, channelId, userId, safeLimit);
        
        return ResponseEntity.ok(messages);
    }
}
