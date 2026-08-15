package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for CommunityChannel entity.
 */
@Repository
public interface CommunityChannelRepository extends JpaRepository<CommunityChannel, UUID> {
    
    /**
     * Finds all channels within a workspace, ordered by creation time.
     */
    List<CommunityChannel> findByWorkspaceIdOrderByCreatedAtAsc(UUID workspaceId);

    /**
     * Finds a specific channel by workspace ID and name.
     */
    Optional<CommunityChannel> findByWorkspaceIdAndName(UUID workspaceId, String name);
}
