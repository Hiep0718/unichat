package com.unichat.core.chat.api;

import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ConversationService;

/** Private conversation lifecycle and strict page/size history endpoints. */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/conversations")
public class ConversationController {
    private final ConversationService conversations;
    /** Uses the authoritative ownership/source service. */
    public ConversationController(ConversationService conversations) { this.conversations=conversations; }
    /** Lists a bounded page; unsupported cursor/limit query parameters return 400. */
    @GetMapping
    public Page<ConversationResponse> getConversations(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @RequestParam Map<String,String> query) {
        return conversations.getConversations(ChatActor.from(jwt),workspaceId,ChatPagination.parse(query,false));
    }
    /** Creates an owned empty conversation. */
    @PostMapping
    public ResponseEntity<ConversationResponse> createConversation(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId) {
        return ResponseEntity.status(201).body(conversations.createConversation(ChatActor.from(jwt),workspaceId));
    }
    /** Returns metadata and the latest message page. */
    @GetMapping("/{conversationId}")
    public ConversationDetailResponse getConversation(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @PathVariable UUID conversationId) {
        return conversations.getConversation(ChatActor.from(jwt),workspaceId,conversationId);
    }
    /** Pages older messages without displacement when new turns arrive. */
    @GetMapping("/{conversationId}/messages")
    public MessagePageResponse messages(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @PathVariable UUID conversationId,@RequestParam Map<String,String> query) {
        var page=ChatPagination.parse(query,true);
        return conversations.messages(ChatActor.from(jwt),workspaceId,conversationId,page.getPageNumber(),page.getPageSize(),ChatPagination.snapshot(query));
    }
    /** Atomically archives metadata and cancels an active operation. */
    @DeleteMapping("/{conversationId}")
    public ResponseEntity<Void> deleteConversation(@AuthenticationPrincipal Jwt jwt,@PathVariable UUID workspaceId,
            @PathVariable UUID conversationId) {
        conversations.deleteConversation(ChatActor.from(jwt),workspaceId,conversationId);
        return ResponseEntity.noContent().build();
    }
}
