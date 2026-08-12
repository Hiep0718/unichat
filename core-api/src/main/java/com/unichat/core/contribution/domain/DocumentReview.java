package com.unichat.core.contribution.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Records a moderation decision (approve or reject) for a contributed document.
 */
@Entity
@Table(name = "document_reviews")
public class DocumentReview {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "reviewer_id", nullable = false)
    private UUID reviewerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reviewer_type", nullable = false, length = 20)
    private ReviewerType reviewerType;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 20)
    private ReviewDecision decision;

    @Column(name = "reason")
    private String reason;

    @Column(name = "reviewed_at", nullable = false)
    private Instant reviewedAt;

    public DocumentReview() {}

    /**
     * Constructs a new document review record.
     */
    public DocumentReview(UUID id, UUID documentId, UUID reviewerId,
                          ReviewerType reviewerType, ReviewDecision decision,
                          String reason, Instant reviewedAt) {
        this.id = id;
        this.documentId = documentId;
        this.reviewerId = reviewerId;
        this.reviewerType = reviewerType;
        this.decision = decision;
        this.reason = reason;
        this.reviewedAt = reviewedAt;
    }

    public UUID getId() { return id; }
    public UUID getDocumentId() { return documentId; }
    public UUID getReviewerId() { return reviewerId; }
    public ReviewerType getReviewerType() { return reviewerType; }
    public ReviewDecision getDecision() { return decision; }
    public String getReason() { return reason; }
    public Instant getReviewedAt() { return reviewedAt; }
}
