package com.unichat.core.chat.api;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.unichat.core.chat.service.ChatService;
import com.unichat.core.chat.service.SseChatService;
import com.unichat.core.shared.idempotency.IdempotencyService;

/**
 * REST controller for asking questions and retrieving adaptive RAG reasoning answers.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/questions")
public class ChatController {

    private final ChatService chatService;
    private final SseChatService sseChatService;
    private final IdempotencyService idempotencyService;

    public ChatController(ChatService chatService, SseChatService sseChatService, IdempotencyService idempotencyService) {
        this.chatService = chatService;
        this.sseChatService = sseChatService;
        this.idempotencyService = idempotencyService;
    }

    /**
     * Asks a question within a workspace and gets adaptive retrieval answer.
     */
    @PostMapping
    public ResponseEntity<?> askQuestion(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody AskQuestionRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @RequestHeader(value = "X-Request-Id", required = false, defaultValue = "") String requestId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String actorId = userId.toString();
        String routeKey = "/workspaces/" + workspaceId + "/questions";

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            String currentHash = idempotencyService.computeHash(request);
            var recordOpt = idempotencyService.getRecord(actorId, routeKey, idempotencyKey);
            if (recordOpt.isPresent()) {
                var record = recordOpt.get();
                idempotencyService.handleConflict(record, currentHash);
                return ResponseEntity.status(record.getResponseStatus())
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .body(record.getResponseBody());
            }

            QuestionResponse response = chatService.askQuestion(userId, workspaceId, request, requestId);
            idempotencyService.saveRecord(actorId, routeKey, idempotencyKey, currentHash, 200, response);
            return ResponseEntity.ok(response);
        }

        QuestionResponse response = chatService.askQuestion(userId, workspaceId, request, requestId);
        return ResponseEntity.ok(response);
    }

    /**
     * Asks a question within a workspace and streams the response token-by-token via Server-Sent Events (SSE).
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter askQuestionStream(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @Valid @RequestBody AskQuestionRequest request,
            @RequestHeader(value = "X-Request-Id", required = false, defaultValue = "") String requestId) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return sseChatService.askQuestionStream(userId, workspaceId, request, requestId);
    }
}
