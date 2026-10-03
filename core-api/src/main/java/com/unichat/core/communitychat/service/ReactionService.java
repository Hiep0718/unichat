package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.ValidationError;
import com.unichat.core.communitychat.api.ReactionRequest;
import com.unichat.core.communitychat.api.ReactionSummary;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.Reaction;
import com.unichat.core.communitychat.domain.ReactionRepository;
import com.unichat.core.communitychat.domain.ReactionType;
import com.unichat.core.shared.util.UuidGenerator;

/**
 * Reactions on posts and replies.
 *
 * <p>A member holds at most one reaction per target: choosing a different one
 * replaces it, choosing the same one removes it. The denormalised vote score
 * counts reactions of any kind, since all of them are positive.
 */
@Service
public class ReactionService {

    private static final String DISCUSSION = "DISCUSSION";
    private static final String DISCUSSION_REPLY = "DISCUSSION_REPLY";

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
     * Applies a reaction and returns the target's new summary.
     *
     * @return counts per type plus the caller's own reaction
     */
    @Transactional
    public ReactionSummary toggleReaction(UUID userId, ReactionRequest request) {
        String targetType = requireTargetType(request.targetType());
        ReactionType requested = parseType(request.reactionType());

        Optional<Reaction> existing = reactionRepository
                .findByUserIdAndTargetTypeAndTargetId(userId, targetType, request.targetId());

        ReactionType mine;
        if (existing.isPresent() && requested.name().equals(existing.get().getReactionType())) {
            reactionRepository.delete(existing.get());
            adjustScore(targetType, request.targetId(), -1);
            mine = null;
        } else if (existing.isPresent()) {
            // Swapping one reaction for another leaves the total unchanged.
            reactionRepository.delete(existing.get());
            reactionRepository.save(newReaction(userId, targetType, request.targetId(), requested));
            mine = requested;
        } else {
            reactionRepository.save(newReaction(userId, targetType, request.targetId(), requested));
            adjustScore(targetType, request.targetId(), 1);
            mine = requested;
        }

        return summarise(targetType, request.targetId(), mine);
    }

    /** Reaction summaries for a page of targets, counted in one query. */
    @Transactional(readOnly = true)
    public Map<UUID, ReactionSummary> summariseAll(String targetType, List<UUID> targetIds, UUID userId) {
        if (targetIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, Map<ReactionType, Long>> countsByTarget = new HashMap<>();
        for (Object[] row : reactionRepository.countByTypeForTargets(targetType, targetIds)) {
            UUID targetId = (UUID) row[0];
            ReactionType type = ReactionType.parse((String) row[1]);
            long count = ((Number) row[2]).longValue();
            countsByTarget.computeIfAbsent(targetId, key -> new EnumMap<>(ReactionType.class))
                    .put(type, count);
        }

        Map<UUID, ReactionType> mine = new HashMap<>();
        reactionRepository.findByUserIdAndTargetTypeAndTargetIdIn(userId, targetType, targetIds)
                .forEach(r -> mine.put(r.getTargetId(), ReactionType.parse(r.getReactionType())));

        Map<UUID, ReactionSummary> summaries = new HashMap<>();
        for (UUID targetId : targetIds) {
            summaries.put(targetId, ReactionSummary.of(
                    countsByTarget.getOrDefault(targetId, Map.of()), mine.get(targetId)));
        }
        return summaries;
    }

    /* ---------- Private helpers ---------- */

    private ReactionSummary summarise(String targetType, UUID targetId, ReactionType mine) {
        Map<ReactionType, Long> counts = new EnumMap<>(ReactionType.class);
        for (Object[] row : reactionRepository.countByTypeForTargets(targetType, List.of(targetId))) {
            counts.put(ReactionType.parse((String) row[1]), ((Number) row[2]).longValue());
        }
        return ReactionSummary.of(counts, mine);
    }

    private Reaction newReaction(UUID userId, String targetType, UUID targetId, ReactionType type) {
        return new Reaction(UuidGenerator.generateV7(), userId, targetType, targetId,
                type.name(), Instant.now());
    }

    private static ReactionType parseType(String raw) {
        try {
            return ReactionType.parse(raw);
        } catch (IllegalArgumentException e) {
            throw new ValidationError(e.getMessage());
        }
    }

    private static String requireTargetType(String raw) {
        if (DISCUSSION.equals(raw) || DISCUSSION_REPLY.equals(raw)) {
            return raw;
        }
        throw new ValidationError("Đối tượng nhận cảm xúc không hợp lệ: " + raw);
    }

    private void adjustScore(String targetType, UUID targetId, int delta) {
        if (DISCUSSION.equals(targetType)) {
            discussionRepository.findById(targetId).ifPresent(d -> {
                d.adjustVoteScore(delta);
                discussionRepository.save(d);
            });
            return;
        }
        discussionReplyRepository.findById(targetId).ifPresent(r -> {
            r.adjustVoteScore(delta);
            discussionReplyRepository.save(r);
        });
    }
}
