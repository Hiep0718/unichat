package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.api.ReactionRequest;
import com.unichat.core.communitychat.domain.Reaction;
import com.unichat.core.communitychat.domain.ReactionRepository;

@Service
public class ReactionService {

    private final ReactionRepository reactionRepository;

    public ReactionService(ReactionRepository reactionRepository) {
        this.reactionRepository = reactionRepository;
    }

    /**
     * Toggles a reaction. If the exact reaction exists, it is removed.
     * If a different reaction exists for the same target, it is updated.
     * Otherwise, a new reaction is created.
     */
    @Transactional
    public void toggleReaction(UUID userId, ReactionRequest request) {
        Optional<Reaction> existing = reactionRepository.findByUserIdAndTargetTypeAndTargetId(
                userId, request.targetType(), request.targetId());

        if (existing.isPresent()) {
            Reaction reaction = existing.get();
            if (reaction.getReactionType().equals(request.reactionType())) {
                // Remove reaction if clicking the same one again
                reactionRepository.delete(reaction);
            } else {
                // Update to new reaction type (e.g. changing UPVOTE to DOWNVOTE)
                // Note: To update, we actually need a setter or delete/recreate. 
                // Since our entity doesn't have a setter for reactionType, we'll recreate it.
                reactionRepository.delete(reaction);
                Reaction newReaction = new Reaction(
                        UUID.randomUUID(), userId, request.targetType(), request.targetId(), 
                        request.reactionType(), Instant.now()
                );
                reactionRepository.save(newReaction);
            }
        } else {
            // Create new reaction
            Reaction newReaction = new Reaction(
                    UUID.randomUUID(), userId, request.targetType(), request.targetId(), 
                    request.reactionType(), Instant.now()
            );
            reactionRepository.save(newReaction);
        }
    }
}
