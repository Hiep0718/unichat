package com.unichat.core.document.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Repository interface for managing Document entities.
 */
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    /**
     * Finds active documents for a workspace (excluding DELETING status).
     */
    @Query("SELECT d FROM Document d WHERE d.workspaceId = :workspaceId AND d.status <> 'DELETING'")
    Page<Document> findByWorkspaceIdExcludingDeleting(@Param("workspaceId") UUID workspaceId, Pageable pageable);

    /**
     * Finds a document by workspace ID and document ID.
     */
    Optional<Document> findByWorkspaceIdAndId(UUID workspaceId, UUID id);

    /**
     * Counts documents in a workspace excluding DELETING.
     */
    @Query("SELECT COUNT(d) FROM Document d WHERE d.workspaceId = :workspaceId AND d.status <> 'DELETING'")
    long countByWorkspaceId(@Param("workspaceId") UUID workspaceId);

    /**
     * Sums total byte size of documents in a workspace.
     */
    @Query("SELECT COALESCE(SUM(d.byteSize), 0) FROM Document d WHERE d.workspaceId = :workspaceId AND d.status <> 'DELETING'")
    long sumByteSizeByWorkspaceId(@Param("workspaceId") UUID workspaceId);

    /**
     * Finds processed documents for authorization list (allowedDocumentIds).
     */
    @Query("SELECT d.id FROM Document d WHERE d.workspaceId IN :workspaceIds AND d.status = 'PROCESSED'")
    List<UUID> findAllowedDocumentIdsForWorkspaces(@Param("workspaceIds") List<UUID> workspaceIds);
}
