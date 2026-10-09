package com.unichat.core.workchat.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A conversation, either between two people or among a group.
 *
 * <p>The "direct" in the class and table name is historical: V22 built this for
 * one-to-one messaging only, and V31 widened it rather than renaming two tables
 * on a shared database. See ADR-023.
 *
 * <p>A {@link ConversationKind#DIRECT} conversation holds its two participants
 * here, in a fixed order, so one pair of people has exactly one conversation
 * whichever of them opened it. A {@link ConversationKind#GROUP} conversation has
 * a title instead, and its members live in {@link ConversationParticipant}.
 * Both kinds also have participant rows, so access and read state are answered
 * one way for both.
 *
 * <p>{@link #between} and {@link #group} are the only ways to build one, which
 * keeps each kind's shape from being bypassed.
 */
@Entity
@Table(name = "direct_conversations")
public class DirectConversation {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, updatable = false)
    private ConversationKind kind;

    /** Null for a group, which has no pair to identify it by. */
    @Column(name = "participant_low", updatable = false)
    private UUID participantLow;

    /** Null for a group, which has no pair to identify it by. */
    @Column(name = "participant_high", updatable = false)
    private UUID participantHigh;

    /** Set for a group only; a one-to-one thread is named by the other person. */
    @Column(name = "title")
    private String title;

    /** Who opened a group. Null for conversations created before V31. */
    @Column(name = "created_by", updatable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Last message time, kept here so the list sorts without a join. */
    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    protected DirectConversation() {}

    private DirectConversation(UUID id, ConversationKind kind, UUID participantLow,
                               UUID participantHigh, String title, UUID createdBy,
                               Instant createdAt) {
        this.id = id;
        this.kind = kind;
        this.participantLow = participantLow;
        this.participantHigh = participantHigh;
        this.title = title;
        this.createdBy = createdBy;
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
                ConversationKind.DIRECT,
                oneIsLower ? one : other,
                oneIsLower ? other : one,
                null,
                null,
                createdAt);
    }

    /**
     * Creates a named group.
     *
     * <p>Membership is not held here: a group with two members and a group with
     * twenty are the same shape, so the members are rows of their own.
     *
     * @throws IllegalArgumentException if the title is blank
     */
    public static DirectConversation group(UUID id, String title, UUID createdBy,
                                           Instant createdAt) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("A group needs a name");
        }
        return new DirectConversation(
                id, ConversationKind.GROUP, null, null, title.trim(), createdBy, createdAt);
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

    public ConversationKind getKind() { return kind; }

    public UUID getParticipantLow() { return participantLow; }

    public UUID getParticipantHigh() { return participantHigh; }

    public String getTitle() { return title; }

    public UUID getCreatedBy() { return createdBy; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getLastMessageAt() { return lastMessageAt; }

    public void setLastMessageAt(Instant lastMessageAt) { this.lastMessageAt = lastMessageAt; }

    public boolean isGroup() { return kind == ConversationKind.GROUP; }

    /**
     * Renames a group.
     *
     * @throws IllegalStateException    on a one-to-one conversation, which is
     *                                  named by the person on the other side
     * @throws IllegalArgumentException if the title is blank
     */
    public void rename(String newTitle) {
        if (!isGroup()) {
            throw new IllegalStateException("A one-to-one conversation has no name");
        }
        if (newTitle == null || newTitle.isBlank()) {
            throw new IllegalArgumentException("A group needs a name");
        }
        this.title = newTitle.trim();
    }

    /**
     * The other person, as seen by this one.
     *
     * @throws IllegalStateException    on a group, where there is no single
     *                                  other person to return
     * @throws IllegalArgumentException if the user is not a participant, which
     *                                  would otherwise silently return someone
     *                                  unrelated
     */
    public UUID otherThan(UUID userId) {
        if (isGroup()) {
            throw new IllegalStateException("A group has no single other participant");
        }
        if (participantLow.equals(userId)) {
            return participantHigh;
        }
        if (participantHigh.equals(userId)) {
            return participantLow;
        }
        throw new IllegalArgumentException("User is not part of this conversation");
    }
}
