package com.unichat.core.chat.api;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.chat.service.ConversationService;

/**
 * REST controller for managing conversation history sessions.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/conversations")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    /**
     * Lists active conversations for the current user in a workspace.
     */
    @GetMapping
    public ResponseEntity<Page<ConversationResponse>> getConversations(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID userId = UUID.fromString(jwt.getSubject());
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(conversationService.getConversations(userId, workspaceId, pageable));
    }

    /**
     * Creates a new empty conversation session.
     */
    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        ConversationResponse response = conversationService.createConversation(userId, workspaceId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Gets conversation details with message history.
     */
    @GetMapping("/{conversationId}")
    public ResponseEntity<ConversationDetailResponse> getConversation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("conversationId") UUID conversationId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(conversationService.getConversation(userId, workspaceId, conversationId));
    }

    /**
     * Deletes a conversation session.
     */
    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Void> deleteConversation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("conversationId") UUID conversationId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        conversationService.deleteConversation(userId, workspaceId, conversationId);
        return ResponseEntity.noContent().build();
    }
}
