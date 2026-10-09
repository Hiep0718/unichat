package com.unichat.core.workchat.api;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.workchat.service.ChatAttachmentService;
import com.unichat.core.workchat.service.ContactDirectory;
import com.unichat.core.workchat.service.DirectMessageService;
import com.unichat.core.workchat.ws.PresenceTracker;

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
    private final ChatAttachmentService attachmentService;
    private final ContactDirectory contactDirectory;
    private final PresenceTracker presenceTracker;

    public WorkChatController(DirectMessageService messageService,
                              ChatAttachmentService attachmentService,
                              ContactDirectory contactDirectory,
                              PresenceTracker presenceTracker) {
        this.messageService = messageService;
        this.attachmentService = attachmentService;
        this.contactDirectory = contactDirectory;
        this.presenceTracker = presenceTracker;
    }

    /**
     * Who among the caller's contacts is connected right now.
     *
     * <p>Restricted to contacts rather than returning everyone online, so this
     * cannot be used to watch people the caller shares no group with.
     */
    @GetMapping("/presence")
    public ResponseEntity<Set<UUID>> presence(@AuthenticationPrincipal Jwt jwt) {
        Set<UUID> online = presenceTracker.onlineUsers();
        return ResponseEntity.ok(contactDirectory.listContacts(callerOf(jwt)).stream()
                .map(ContactSummary::userId)
                .filter(online::contains)
                .collect(java.util.stream.Collectors.toSet()));
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

    /**
     * Sends a message carrying files, with optional text alongside them.
     *
     * <p>A second mapping rather than a flag on the JSON one, so the text
     * path keeps working untouched. Text and files travel together because
     * the message is pushed to the recipient the moment it commits.
     */
    @PostMapping(value = "/conversations/{conversationId}/messages",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<MessageResponse> sendWithFiles(
            @PathVariable UUID conversationId,
            @RequestParam(value = "body", required = false) String body,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(messageService.send(
                callerOf(jwt), conversationId, body, files == null ? List.of() : files));
    }

    /**
     * Serves one attachment to a participant of the conversation.
     *
     * <p>Only the images on the allowlist are shown inline. Anything else
     * is a download, and nothing is sniffed, so a file whose declared type
     * is a lie cannot run as script in the API's own origin.
     */
    @GetMapping("/conversations/{conversationId}/messages/{messageId}"
            + "/attachments/{attachmentId}/content")
    public ResponseEntity<byte[]> readAttachment(
            @PathVariable UUID conversationId,
            @PathVariable UUID messageId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal Jwt jwt) {
        var content = attachmentService.read(
                callerOf(jwt), conversationId, messageId, attachmentId);
        ContentDisposition disposition = content.renderInline()
                ? ContentDisposition.inline().filename(content.fileName()).build()
                : ContentDisposition.attachment().filename(content.fileName()).build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, content.mediaType())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                // Private to the conversation, so no shared cache may hold it.
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=600")
                .body(content.bytes());
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
