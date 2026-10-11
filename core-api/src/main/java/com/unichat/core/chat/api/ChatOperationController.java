package com.unichat.core.chat.api;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatOperationService;

/** Owner-only recovery and explicit cancellation for durable chat requests. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/chat-operations")
public class ChatOperationController {
    private final ChatOperationService operations;
    /** Uses the same lifecycle as both ask transports. */
    public ChatOperationController(ChatOperationService operations) { this.operations=operations; }
    /** Returns a current authorized result; RUNNING responses include a polling interval. */
    @GetMapping("/{operationId}")
    public ResponseEntity<ChatOperationResponse> status(@AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID workspaceId,@PathVariable UUID operationId) {
        var result=operations.status(ChatActor.from(jwt),workspaceId,operationId);
        var response=ResponseEntity.ok();
        if ("RUNNING".equals(result.state())) response.header("Retry-After","2");
        return response.header("Cache-Control","no-store").body(result);
    }
    /** Idempotently requests a terminal cancel; completed data remains completed. */
    @PostMapping("/{operationId}/cancel")
    public ChatOperationResponse cancel(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @PathVariable UUID operationId) {
        return operations.cancel(ChatActor.from(jwt),workspaceId,operationId);
    }
}
