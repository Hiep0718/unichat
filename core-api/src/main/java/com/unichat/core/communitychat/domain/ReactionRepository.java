package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReactionRepository extends JpaRepository<Reaction, UUID> {
    
    Optional<Reaction> findByUserIdAndTargetTypeAndTargetId(UUID userId, String targetType, UUID targetId);

    List<Reaction> findByTargetTypeAndTargetId(String targetType, UUID targetId);
    
    long countByTargetTypeAndTargetIdAndReactionType(String targetType, UUID targetId, String reactionType);
}
