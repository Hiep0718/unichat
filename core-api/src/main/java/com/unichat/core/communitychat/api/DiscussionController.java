package com.unichat.core.communitychat.api;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.communitychat.service.DiscussionService;
import com.unichat.core.communitychat.service.PostAttachmentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/discussions")
public class DiscussionController {

    private final DiscussionService discussionService;
    private final PostAttachmentService attachmentService;

    public DiscussionController(DiscussionService discussionService,
                                PostAttachmentService attachmentService) {
        this.discussionService = discussionService;
        this.attachmentService = attachmentService;
    }

    @GetMapping
    public ResponseEntity<Page<DiscussionResponse>> listDiscussions(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String label,
            @RequestParam(defaultValue = "NEW") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        Page<DiscussionResponse> discussions = discussionService.listDiscussions(workspaceId, userId, label, sort, page, size);
        return ResponseEntity.ok(discussions);
    }

    @GetMapping("/{discussionId}")
    public ResponseEntity<DiscussionResponse> getDiscussion(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @AuthenticationPrincipal Jwt jwt) {
            
        UUID userId = UUID.fromString(jwt.getSubject());
        DiscussionResponse discussion = discussionService.getDiscussion(workspaceId, discussionId, userId);
        return ResponseEntity.ok(discussion);
    }

    @PostMapping
    public ResponseEntity<DiscussionResponse> createDiscussion(
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateDiscussionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        DiscussionResponse discussion = discussionService.createDiscussion(workspaceId, userId, request);
        return ResponseEntity.ok(discussion);
    }

    @GetMapping("/{discussionId}/replies")
    public ResponseEntity<List<ReplyResponse>> getReplies(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @AuthenticationPrincipal Jwt jwt) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        List<ReplyResponse> replies = discussionService.getReplies(workspaceId, discussionId, userId);
        return ResponseEntity.ok(replies);
    }

    @PostMapping("/{discussionId}/replies")
    public ResponseEntity<ReplyResponse> addReply(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @Valid @RequestBody CreateReplyRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        ReplyResponse reply = discussionService.addReply(workspaceId, discussionId, userId, request);
        return ResponseEntity.ok(reply);
    }

    /** Accept a reply as the best answer (StackOverflow-style). */
    /**
     * Members the composer can suggest for a mention. Available to any member,
     * unlike the full roster.
     */
    @GetMapping("/mentionable-members")
    public ResponseEntity<List<MentionableMember>> getMentionableMembers(
            @PathVariable UUID workspaceId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(discussionService.listMentionableMembers(workspaceId, userId));
    }

    /** Edits a post. Author only; the label stays fixed at creation. */
    @PutMapping("/{discussionId}")
    public ResponseEntity<DiscussionResponse> updateDiscussion(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @Valid @RequestBody UpdateDiscussionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                discussionService.updateDiscussion(workspaceId, discussionId, userId, request));
    }

    /** Removes a post. Author, or an owner/editor of the group. */
    @DeleteMapping("/{discussionId}")
    public ResponseEntity<Void> deleteDiscussion(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        discussionService.deleteDiscussion(workspaceId, discussionId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Attaches a file to a post. A document attachment also enters the group's
     * library, following the usual contribution and approval rules.
     */
    @PostMapping(value = "/{discussionId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PostAttachmentResponse> addAttachment(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @RequestPart("file") MultipartFile file,
            @RequestHeader(value = "X-Request-Id", required = false) String requestId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String correlationId = requestId != null ? requestId : UUID.randomUUID().toString();
        return ResponseEntity.ok(
                attachmentService.attach(workspaceId, discussionId, userId, file, correlationId));
    }

    @DeleteMapping("/{discussionId}/attachments/{attachmentId}")
    public ResponseEntity<Void> removeAttachment(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        attachmentService.remove(workspaceId, discussionId, attachmentId, userId);
        return ResponseEntity.noContent().build();
    }

    /** Serves attachment bytes to members of the owning workspace. */
    @GetMapping("/{discussionId}/attachments/{attachmentId}/content")
    public ResponseEntity<byte[]> readAttachment(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        var content = attachmentService.read(workspaceId, discussionId, attachmentId, userId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, content.mediaType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(content.fileName()).toString())
                .body(content.bytes());
    }

    @PutMapping("/{discussionId}/accept-reply/{replyId}")
    public ResponseEntity<DiscussionResponse> acceptReply(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @PathVariable UUID replyId,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                discussionService.acceptReply(workspaceId, discussionId, replyId, userId));
    }
}
