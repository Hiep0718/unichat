package com.unichat.core.communitychat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A reply within a discussion thread.
 */
@Entity
@Table(name = "discussion_replies")
public class DiscussionReply {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "discussion_id", nullable = false)
    private UUID discussionId;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "body", nullable = false)
    private String body;

    @Column(name = "parent_reply_id")
    private UUID parentReplyId;

    @Column(name = "is_ai_answer", nullable = false)
    private boolean isAiAnswer;

    @Column(name = "vote_score", nullable = false)
    private int voteScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public DiscussionReply() {}

    public DiscussionReply(UUID id, UUID discussionId, UUID authorId, String body, 
                           UUID parentReplyId, boolean isAiAnswer, Instant createdAt) {
        this.id = id;
        this.discussionId = discussionId;
        this.authorId = authorId;
        this.body = body;
        this.parentReplyId = parentReplyId;
        this.isAiAnswer = isAiAnswer;
        this.voteScore = 0;
        this.createdAt = createdAt;
    }

    public UUID getId() { return id; }
    public UUID getDiscussionId() { return discussionId; }
    public UUID getAuthorId() { return authorId; }
    public String getBody() { return body; }
    public UUID getParentReplyId() { return parentReplyId; }
    public boolean isAiAnswer() { return isAiAnswer; }
    public Instant getCreatedAt() { return createdAt; }
    public int getVoteScore() { return voteScore; }
    
    public void setBody(String body) { this.body = body; }
    public void adjustVoteScore(int delta) { this.voteScore += delta; }
}
