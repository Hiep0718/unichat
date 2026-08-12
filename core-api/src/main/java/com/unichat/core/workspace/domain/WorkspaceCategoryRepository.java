package com.unichat.core.workspace.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for workspace category master data.
 */
public interface WorkspaceCategoryRepository extends JpaRepository<WorkspaceCategory, String> {

    /**
     * Finds all categories ordered by sort_order ascending.
     */
    List<WorkspaceCategory> findAllByOrderBySortOrderAsc();
}
