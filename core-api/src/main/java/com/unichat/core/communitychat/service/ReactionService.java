package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.api.ReactionRequest;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionReply;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.Reaction;
import com.unichat.core.communitychat.domain.ReactionRepository;

@Service
public class ReactionService {

    private final ReactionRepository reactionRepository;
    private final DiscussionRepository discussionRepository;
    private final DiscussionReplyRepository discussionReplyRepository;

    public ReactionService(ReactionRepository reactionRepository,
                           DiscussionRepository discussionRepository,
                           DiscussionReplyRepository discussionReplyRepository) {
        this.reactionRepository = reactionRepository;
        this.discussionRepository = discussionRepository;
        this.discussionReplyRepository = discussionReplyRepository;
    }

    /**
     * Toggles a reaction and adjusts vote scores for discussions and replies.
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
                adjustScore(request.targetType(), request.targetId(), calculateDelta(reaction.getReactionType(), null));
            } else {
                // Update to new reaction type
                reactionRepository.delete(reaction);
                Reaction newReaction = new Reaction(
                        UUID.randomUUID(), userId, request.targetType(), request.targetId(), 
                        request.reactionType(), Instant.now()
                );
                reactionRepository.save(newReaction);
                adjustScore(request.targetType(), request.targetId(), calculateDelta(reaction.getReactionType(), request.reactionType()));
            }
        } else {
            // Create new reaction
            Reaction newReaction = new Reaction(
                    UUID.randomUUID(), userId, request.targetType(), request.targetId(), 
                    request.reactionType(), Instant.now()
            );
            reactionRepository.save(newReaction);
            adjustScore(request.targetType(), request.targetId(), calculateDelta(null, request.reactionType()));
        }
    }
    
    private int calculateDelta(String oldType, String newType) {
        int oldScore = oldType == null ? 0 : (oldType.equals("UPVOTE") ? 1 : (oldType.equals("DOWNVOTE") ? -1 : 0));
        int newScore = newType == null ? 0 : (newType.equals("UPVOTE") ? 1 : (newType.equals("DOWNVOTE") ? -1 : 0));
        return newScore - oldScore;
    }
    
    private void adjustScore(String targetType, UUID targetId, int delta) {
        if (delta == 0) return;
        
        if ("DISCUSSION".equals(targetType)) {
            discussionRepository.findById(targetId).ifPresent(d -> {
                d.adjustVoteScore(delta);
                discussionRepository.save(d);
            });
        } else if ("DISCUSSION_REPLY".equals(targetType)) {
            discussionReplyRepository.findById(targetId).ifPresent(r -> {
                r.adjustVoteScore(delta);
                discussionReplyRepository.save(r);
            });
        }
    }
}
