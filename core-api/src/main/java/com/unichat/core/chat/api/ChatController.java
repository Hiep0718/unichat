package com.unichat.core.chat.api;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.chat.service.ChatService;

/**
 * REST controller for asking questions and retrieving adaptive RAG reasoning answers.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/questions")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * Asks a question within a workspace and gets adaptive retrieval answer.
     */
    @PostMapping
    public ResponseEntity<QuestionResponse> askQuestion(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody AskQuestionRequest request,
            @RequestHeader(value = "X-Request-Id", required = false, defaultValue = "") String requestId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        QuestionResponse response = chatService.askQuestion(userId, workspaceId, request, requestId);
        return ResponseEntity.ok(response);
    }
}
