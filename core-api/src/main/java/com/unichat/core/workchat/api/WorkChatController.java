package com.unichat.core.workchat.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.workchat.service.ContactDirectory;
import com.unichat.core.workchat.service.DirectMessageService;

import jakarta.validation.Valid;

/**
 * One-to-one messaging between members of the same group.
 */
@RestController
@RequestMapping("/api/v1/work-chat")
public class WorkChatController {

    /** Matches the pagination ceiling required by the engineering standards. */
    private static final int MAX_PAGE_SIZE = 100;
    private static final int DEFAULT_PAGE_SIZE = 20;

    private final DirectMessageService messageService;
    private final ContactDirectory contactDirectory;

    public WorkChatController(DirectMessageService messageService,
                              ContactDirectory contactDirectory) {
        this.messageService = messageService;
        this.contactDirectory = contactDirectory;
    }

    /** People the caller may start a conversation with. */
    @GetMapping("/contacts")
    public ResponseEntity<List<ContactSummary>> contacts(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(contactDirectory.listContacts(callerOf(jwt)));
    }

    /** The caller's conversations, most recently active first. */
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationSummary>> conversations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                messageService.listConversations(callerOf(jwt), page, clamp(size)));
    }

    /** Opens the conversation with someone, creating it on first contact. */
    @PostMapping("/conversations/with/{userId}")
    public ResponseEntity<ConversationSummary> open(
            @PathVariable UUID userId,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(messageService.openWith(callerOf(jwt), userId));
    }

    /** Messages in a conversation, newest first. */
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<MessageResponse>> messages(
            @PathVariable UUID conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                messageService.listMessages(callerOf(jwt), conversationId, page, clamp(size)));
    }

    /** Sends a message to the other participant. */
    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<MessageResponse> send(
            @PathVariable UUID conversationId,
            @Valid @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(
                messageService.send(callerOf(jwt), conversationId, request.body()));
    }

    /** Marks the other person's messages in this conversation as read. */
    @PostMapping("/conversations/{conversationId}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal Jwt jwt) {
        messageService.markRead(callerOf(jwt), conversationId);
        return ResponseEntity.noContent().build();
    }

    private static UUID callerOf(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private static int clamp(int size) {
        return Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    }
}
