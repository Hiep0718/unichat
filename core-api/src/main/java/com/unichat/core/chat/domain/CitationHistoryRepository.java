package com.unichat.core.chat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository interface for managing CitationHistory entities.
 */
public interface CitationHistoryRepository extends JpaRepository<CitationHistory, UUID> {

    List<CitationHistory> findByMessageIdOrderByOrdinalAsc(UUID messageId);

    List<CitationHistory> findByMessageIdIn(List<UUID> messageIds);
}
