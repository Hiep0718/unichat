package com.unichat.core.communitychat.api;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.communitychat.domain.SummaryState;
import com.unichat.core.communitychat.service.AttachmentSummaryService;

/**
 * AI summaries of documents attached to posts, produced when a member asks.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/discussions/{discussionId}/attachments/{attachmentId}/summary")
public class AttachmentSummaryController {

    private final AttachmentSummaryService summaries;

    /**
     * @param summaries starts and reads attachment summaries
     */
    public AttachmentSummaryController(AttachmentSummaryService summaries) {
        this.summaries = summaries;
    }

    /**
     * Asks the assistant to summarise the attachment as the calling member.
     *
     * @return 202 with state {@code PENDING} while it runs, or 200 with the
     *         summary the attachment already has
     */
    @PostMapping
    public ResponseEntity<PostAttachmentResponse> request(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal Jwt jwt) {
        PostAttachmentResponse attachment =
                summaries.request(workspaceId, discussionId, attachmentId, ChatActor.from(jwt));
        HttpStatus status = attachment.summaryState() == SummaryState.READY ? HttpStatus.OK : HttpStatus.ACCEPTED;
        return ResponseEntity.status(status).body(attachment);
    }

    /**
     * Reads the attachment's current summary state, for a member waiting on it.
     *
     * @return the attachment with its summary state and, when ready, the text
     */
    @GetMapping
    public PostAttachmentResponse current(
            @PathVariable UUID workspaceId,
            @PathVariable UUID discussionId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal Jwt jwt) {
        return summaries.current(workspaceId, discussionId, attachmentId, UUID.fromString(jwt.getSubject()));
    }
}
