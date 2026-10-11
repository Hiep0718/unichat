package com.unichat.core.chat.api;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatOperationService;
import com.unichat.core.chat.service.ChatService;
import com.unichat.core.chat.service.SseChatService;

/** Public chat asks share one mandatory actor/key namespace across both transports. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/questions")
public class ChatController {
    private static final String UUID_PATTERN="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
    private final ChatService chat;
    private final SseChatService streams;
    private final ChatOperationService operations;
    /** Receives the common operation boundary. */
    public ChatController(ChatService chat,SseChatService streams,ChatOperationService operations) {
        this.chat=chat;this.streams=streams;this.operations=operations;
    }
    /** Returns a completed canonical result or 202 with an owner-only status pointer. */
    @PostMapping
    public ResponseEntity<?> askQuestion(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @Valid @RequestBody AskQuestionRequest request,
            @RequestHeader("Idempotency-Key") @Pattern(regexp=UUID_PATTERN) String key,
            @RequestHeader(value="X-Request-Id",required=false) @Size(max=100) String requestId) {
        var response=chat.ask(ChatActor.from(jwt),workspaceId,request,UUID.fromString(key),requestId(requestId));
        if ("RUNNING".equals(response.state())) return running(workspaceId,response);
        if ("COMPLETED".equals(response.state())) return ResponseEntity.ok(response.result());
        return ResponseEntity.status(409).body(response);
    }
    /** Replays completed content; an already-running operation returns 202 rather than starting twice. */
    @PostMapping(value="/stream",produces={MediaType.TEXT_EVENT_STREAM_VALUE,MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<?> askQuestionStream(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @Valid @RequestBody AskQuestionRequest request,
            @RequestHeader("Idempotency-Key") @Pattern(regexp=UUID_PATTERN) String key,
            @RequestHeader(value="X-Request-Id",required=false) @Size(max=100) String requestId) {
        var actor=ChatActor.from(jwt);
        var reservation=operations.reserve(actor,workspaceId,request,UUID.fromString(key),requestId(requestId));
        if (!reservation.created() && "RUNNING".equals(reservation.operation().state())) {
            return running(workspaceId,operations.status(actor,workspaceId,reservation.operation().id()));
        }
        return ResponseEntity.ok().contentType(MediaType.TEXT_EVENT_STREAM).header("Cache-Control","no-store")
                .header("X-Accel-Buffering","no").body(streams.stream(reservation));
    }
    private ResponseEntity<ChatOperationResponse> running(UUID workspaceId,ChatOperationResponse response) {
        return ResponseEntity.accepted().header("Retry-After","2")
                .header("Location","/api/v1/workspaces/"+workspaceId+"/chat-operations/"+response.operationId()).body(response);
    }
    private String requestId(String value) { return value==null || value.isBlank()?UUID.randomUUID().toString():value; }
}
