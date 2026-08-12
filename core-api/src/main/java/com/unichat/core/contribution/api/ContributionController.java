package com.unichat.core.contribution.api;

import java.util.UUID;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

import com.unichat.core.contribution.domain.DocumentReview;
import com.unichat.core.contribution.service.ContributionService;
import com.unichat.core.document.domain.Document;

/**
 * REST controller for document contribution review workflow.
 */
@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/contributions")
public class ContributionController {

    private final ContributionService contributionService;

    public ContributionController(ContributionService contributionService) {
        this.contributionService = contributionService;
    }

    /** Lists documents pending OWNER/EDITOR review. */
    @GetMapping
    public ResponseEntity<Page<Document>> getPendingContributions(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        UUID userId = UUID.fromString(jwt.getSubject());
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        return ResponseEntity.ok(contributionService.getPendingContributions(userId, workspaceId, pageable));
    }

    /** Approves or rejects a contributed document. */
    @PostMapping("/{documentId}/review")
    public ResponseEntity<ReviewContributionResponse> reviewContribution(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("workspaceId") UUID workspaceId,
            @PathVariable("documentId") UUID documentId,
            @Valid @RequestBody ReviewContributionRequest request) {
        UUID userId = UUID.fromString(jwt.getSubject());
        DocumentReview review = contributionService.reviewContribution(
                userId, workspaceId, documentId,
                request.approved(), request.reason());
        return ResponseEntity.ok(ReviewContributionResponse.from(review));
    }
}
