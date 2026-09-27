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
     * Counts documents per workspace for a page of workspaces.
     *
     * <p>One query for the whole page rather than one per card, which is what
     * a list of twenty groups would otherwise cost.
     *
     * @return rows of {workspaceId, count}; a workspace with none is absent
     */
    @Query("SELECT d.workspaceId, COUNT(d) FROM Document d "
            + "WHERE d.workspaceId IN :workspaceIds AND d.status <> 'DELETING' "
            + "GROUP BY d.workspaceId")
    List<Object[]> countGroupedByWorkspaceIds(@Param("workspaceIds") List<UUID> workspaceIds);

    /**
     * Sums total byte size of documents in a workspace.
     */
    @Query("SELECT COALESCE(SUM(d.byteSize), 0) FROM Document d WHERE d.workspaceId = :workspaceId AND d.status <> 'DELETING'")
    long sumByteSizeByWorkspaceId(@Param("workspaceId") UUID workspaceId);

    /**
     * Finds active documents for authorization list (allowedDocumentIds).
     */
    @Query("SELECT d.id FROM Document d WHERE d.workspaceId IN :workspaceIds AND d.status = 'PROCESSED'")
    List<UUID> findAllowedDocumentIdsForWorkspaces(@Param("workspaceIds") List<UUID> workspaceIds);

    /** Documents a member contributed, within groups the caller can see. */
    @Query("SELECT count(d) FROM Document d WHERE d.uploadedBy = :userId "
            + "AND d.workspaceId IN :workspaceIds AND d.status <> 'DELETING'")
    long countContributedBy(@Param("userId") UUID userId,
                            @Param("workspaceIds") List<UUID> workspaceIds);

    /** Of those, the ones that reached the library and can be cited. */
    @Query("SELECT count(d) FROM Document d WHERE d.uploadedBy = :userId "
            + "AND d.workspaceId IN :workspaceIds AND d.status = 'PROCESSED'")
    long countApprovedFrom(@Param("userId") UUID userId,
                           @Param("workspaceIds") List<UUID> workspaceIds);

    /**
     * Finds documents by name across several workspaces, for unified search.
     *
     * <p>Matches on the uploaded file name rather than the contents: searching
     * inside documents is what retrieval is for, and duplicating it here with
     * SQL would give a worse answer by a second route. DELETING rows are
     * excluded so a document being removed never appears in results.
     *
     * @param workspaceIds the groups the caller belongs to; never widened here
     */
    @Query("SELECT d FROM Document d WHERE d.workspaceId IN :workspaceIds "
            + "AND d.status <> 'DELETING' "
            + "AND LOWER(d.originalName) LIKE LOWER(CONCAT('%', :q, '%')) "
            + "ORDER BY d.createdAt DESC")
    Page<Document> searchByNameInWorkspaces(@Param("workspaceIds") List<UUID> workspaceIds,
                                            @Param("q") String q,
                                            Pageable pageable);

    /**
     * Lists member contributions awaiting an owner/editor decision.
     *
     * @param workspaceId workspace being moderated
     * @param pageable    pagination parameters
     */
    Page<Document> findByWorkspaceIdAndStatusOrderByCreatedAtDesc(
            UUID workspaceId, DocumentStatus status, Pageable pageable);

    /**
     * Counts contributions awaiting a decision, for the moderation badge.
     */
    long countByWorkspaceIdAndStatus(UUID workspaceId, DocumentStatus status);
}

