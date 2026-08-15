package com.unichat.core.chat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repository interface for managing CitationHistory entities.
 */
public interface CitationHistoryRepository extends JpaRepository<CitationHistory, UUID> {

    List<CitationHistory> findByMessageIdOrderByOrdinalAsc(UUID messageId);

    List<CitationHistory> findByMessageIdIn(List<UUID> messageIds);

    @Modifying
    @Query("UPDATE CitationHistory c SET c.excerpt = '[REDACTED]' WHERE c.documentId = :documentId")
    void redactByDocumentId(@Param("documentId") UUID documentId);
}
