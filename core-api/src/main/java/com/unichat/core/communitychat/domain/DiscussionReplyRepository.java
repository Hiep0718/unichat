package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscussionReplyRepository extends JpaRepository<DiscussionReply, UUID> {
    
    /**
     * Lists all replies for a discussion, ordered by creation time.
     */
    List<DiscussionReply> findByDiscussionIdOrderByCreatedAtAsc(UUID discussionId);
}
