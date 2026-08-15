package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A reaction (upvote, downvote, helpful) on a target (message, discussion, etc.).
 */
@Entity
@Table(name = "reactions")
public class Reaction {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "target_type", nullable = false, length = 30)
    private String targetType; // COMMUNITY_MESSAGE, DISCUSSION, DISCUSSION_REPLY, AI_ANSWER

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(name = "reaction_type", nullable = false, length = 10)
    private String reactionType; // UPVOTE, DOWNVOTE, HELPFUL

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Reaction() {}

    public Reaction(UUID id, UUID userId, String targetType, UUID targetId, String reactionType, Instant createdAt) {
        this.id = id;
        this.userId = userId;
        this.targetType = targetType;
        this.targetId = targetId;
        this.reactionType = reactionType;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getTargetType() { return targetType; }
    public UUID getTargetId() { return targetId; }
    public String getReactionType() { return reactionType; }
    public Instant getCreatedAt() { return createdAt; }
}
