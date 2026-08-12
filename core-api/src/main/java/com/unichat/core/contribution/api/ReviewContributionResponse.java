package com.unichat.core.contribution.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.contribution.domain.DocumentReview;
import com.unichat.core.contribution.domain.ReviewDecision;
import com.unichat.core.contribution.domain.ReviewerType;

/**
 * Output representation of a document review decision.
 */
public record ReviewContributionResponse(
    UUID id,
    UUID documentId,
    UUID reviewerId,
    ReviewerType reviewerType,
    ReviewDecision decision,
    String reason,
    Instant reviewedAt
) {
    /** Maps a DocumentReview entity to response DTO. */
    public static ReviewContributionResponse from(DocumentReview review) {
        return new ReviewContributionResponse(
            review.getId(),
            review.getDocumentId(),
            review.getReviewerId(),
            review.getReviewerType(),
            review.getDecision(),
            review.getReason(),
            review.getReviewedAt()
        );
    }
}
