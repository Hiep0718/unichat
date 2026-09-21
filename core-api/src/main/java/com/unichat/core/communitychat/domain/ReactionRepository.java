package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReactionRepository extends JpaRepository<Reaction, UUID> {
    
    Optional<Reaction> findByUserIdAndTargetTypeAndTargetId(UUID userId, String targetType, UUID targetId);
    
    List<Reaction> findByUserIdAndTargetTypeAndTargetIdIn(UUID userId, String targetType, List<UUID> targetIds);


    List<Reaction> findByTargetTypeAndTargetId(String targetType, UUID targetId);
    
    long countByTargetTypeAndTargetIdAndReactionType(String targetType, UUID targetId, String reactionType);

    /**
     * Counts reactions per type for a page of targets in one query.
     *
     * @return rows of {@code [targetId, reactionType, count]}
     */
    @Query("SELECT r.targetId, r.reactionType, count(r) FROM Reaction r "
            + "WHERE r.targetType = :targetType AND r.targetId IN :targetIds "
            + "GROUP BY r.targetId, r.reactionType")
    List<Object[]> countByTypeForTargets(@Param("targetType") String targetType,
                                         @Param("targetIds") List<UUID> targetIds);
}
