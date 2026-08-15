package com.unichat.core.communitychat.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.communitychat.service.CommunityChatService;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/channels")
public class CommunityChannelController {

    private final CommunityChatService chatService;

    public CommunityChannelController(CommunityChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping
    public ResponseEntity<List<ChannelResponse>> listChannels(
            @PathVariable UUID workspaceId,
            @AuthenticationPrincipal Jwt jwt) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        List<ChannelResponse> channels = chatService.listChannels(workspaceId, userId);
        return ResponseEntity.ok(channels);
    }
}
