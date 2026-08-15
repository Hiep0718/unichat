package com.unichat.core.communitychat.domain;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionRepository extends JpaRepository<Discussion, UUID> {
    
    /**
     * Lists discussions in a workspace, usually sorted by pinned DESC, updated_at DESC.
     */
    Page<Discussion> findByWorkspaceId(UUID workspaceId, Pageable pageable);
    
    /**
     * Lists discussions filtered by label.
     */
    Page<Discussion> findByWorkspaceIdAndLabel(UUID workspaceId, String label, Pageable pageable);
}
