package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for CommunityMessage entity.
 */
@Repository
public interface CommunityMessageRepository extends JpaRepository<CommunityMessage, UUID> {
    
    /**
     * Retrieves messages for a specific channel, typically ordered by created_at DESC for pagination.
     */
    List<CommunityMessage> findByChannelIdOrderByCreatedAtDesc(UUID channelId, Pageable pageable);
}
