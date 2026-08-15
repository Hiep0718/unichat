package com.unichat.core.communitychat.api;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
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

import com.unichat.core.communitychat.service.DiscussionService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/discussions")
public class DiscussionController {

    private final DiscussionService discussionService;

    public DiscussionController(DiscussionService discussionService) {
        this.discussionService = discussionService;
    }

    @GetMapping
    public ResponseEntity<Page<DiscussionResponse>> listDiscussions(
            @PathVariable UUID workspaceId,
            @RequestParam(required = false) String label,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        
        UUID userId = UUID.fromString(jwt.getSubject());
        Page<DiscussionResponse> discussions = discussionService.listDiscussions(workspaceId, userId, label, page, size);
        return ResponseEntity.ok(discussions);
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
}
