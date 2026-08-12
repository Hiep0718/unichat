package com.unichat.core.contribution.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for document review records.
 */
public interface DocumentReviewRepository extends JpaRepository<DocumentReview, UUID> {

    /**
     * Finds all reviews for a document, newest first.
     */
    List<DocumentReview> findByDocumentIdOrderByReviewedAtDesc(UUID documentId);
}
