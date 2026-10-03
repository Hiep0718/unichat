package com.unichat.core.workchat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A one-to-one conversation between two people.
 *
 * <p>The two participants are held in a fixed order rather than as "starter"
 * and "recipient", so one pair of people has exactly one conversation whichever
 * of them opened it. {@link #between} is the only way to build one, which keeps
 * that ordering from being bypassed.
 */
@Entity
@Table(name = "direct_conversations")
public class DirectConversation {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "participant_low", nullable = false, updatable = false)
    private UUID participantLow;

    @Column(name = "participant_high", nullable = false, updatable = false)
    private UUID participantHigh;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Last message time, kept here so the list sorts without a join. */
    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    protected DirectConversation() {}

    private DirectConversation(UUID id, UUID participantLow, UUID participantHigh, Instant createdAt) {
        this.id = id;
        this.participantLow = participantLow;
        this.participantHigh = participantHigh;
        this.createdAt = createdAt;
    }

    /**
     * Creates the conversation between two people, ordering the participants so
     * the pair is identified the same way from either side.
     *
     * @throws IllegalArgumentException if both ids are the same person
     */
    public static DirectConversation between(UUID id, UUID one, UUID other, Instant createdAt) {
        if (one.equals(other)) {
            throw new IllegalArgumentException("A conversation needs two different people");
        }
        boolean oneIsLower = one.compareTo(other) < 0;
        return new DirectConversation(
                id,
                oneIsLower ? one : other,
                oneIsLower ? other : one,
                createdAt);
    }

    /** Orders a pair the same way {@link #between} does, for lookups. */
    public static UUID lowerOf(UUID one, UUID other) {
        return one.compareTo(other) < 0 ? one : other;
    }

    /** Orders a pair the same way {@link #between} does, for lookups. */
    public static UUID higherOf(UUID one, UUID other) {
        return one.compareTo(other) < 0 ? other : one;
    }

    public UUID getId() { return id; }

    public UUID getParticipantLow() { return participantLow; }

    public UUID getParticipantHigh() { return participantHigh; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getLastMessageAt() { return lastMessageAt; }

    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    /** Whether this user is one of the two people in the conversation. */
    public boolean includes(UUID userId) {
        return participantLow.equals(userId) || participantHigh.equals(userId);
    }

    /**
     * The other person, as seen by this one.
     *
     * @throws IllegalArgumentException if the user is not a participant, which
     *                                  would otherwise silently return someone
     *                                  unrelated
     */
    public UUID otherThan(UUID userId) {
        if (participantLow.equals(userId)) {
            return participantHigh;
        }
        if (participantHigh.equals(userId)) {
            return participantLow;
        }
        throw new IllegalArgumentException("User is not part of this conversation");
    }
}
