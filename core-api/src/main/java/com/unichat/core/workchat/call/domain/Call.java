package com.unichat.core.workchat.call.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * One call between two people, as it is remembered afterwards.
 *
 * <p>Holds no signalling. The SDP offers, answers and ICE candidates that set a
 * call up describe network addresses and codecs for a session that is dead the
 * moment it ends; they are relayed between the two browsers and never written
 * down. What is kept is what a conversation needs to show: who called whom,
 * when, for how long, and how it ended.
 *
 * <p>State changes go through the methods here rather than through setters, so
 * the transitions live in one place and a timestamp cannot be set without the
 * status that explains it. {@link CallStateMachine} decides whether a
 * transition is allowed; this class performs it.
 *
 * @see CallRepository
 */
@Entity
@Table(name = "calls")
public class Call {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "conversation_id", nullable = false, updatable = false)
    private UUID conversationId;

    @Column(name = "caller_id", nullable = false, updatable = false)
    private UUID callerId;

    @Column(name = "callee_id", nullable = false, updatable = false)
    private UUID calleeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "media", nullable = false, updatable = false)
    private CallMedia media;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CallStatus status;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "answered_at")
    private Instant answeredAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "end_reason")
    private CallEndReason endReason;

    protected Call() {
        // for JPA
    }

    private Call(UUID conversationId, UUID callerId, UUID calleeId, CallMedia media, Instant now) {
        this.id = UUID.randomUUID();
        this.conversationId = conversationId;
        this.callerId = callerId;
        this.calleeId = calleeId;
        this.media = media;
        this.status = CallStatus.RINGING;
        this.startedAt = now;
    }

    /** Starts a call that is ringing but not yet answered. */
    public static Call ring(UUID conversationId, UUID callerId, UUID calleeId,
                            CallMedia media, Instant now) {
        return new Call(conversationId, callerId, calleeId, media, now);
    }

    /** The callee picked up. */
    public void answer(Instant now) {
        this.status = CallStatus.ACTIVE;
        this.answeredAt = now;
    }

    /**
     * The call is over.
     *
     * <p>The status follows from the reason rather than being passed in
     * separately: letting a caller supply both is how a row ends up marked
     * {@code DECLINED} with a reason of {@code HUNG_UP}.
     */
    public void finish(CallEndReason reason, Instant now) {
        this.status = statusFor(reason);
        this.endReason = reason;
        this.endedAt = now;
    }

    private CallStatus statusFor(CallEndReason reason) {
        return switch (reason) {
            case DECLINED -> CallStatus.DECLINED;
            case NO_ANSWER, OFFLINE, BUSY -> CallStatus.MISSED;
            case CONNECTION_FAILED -> CallStatus.FAILED;
            // Hanging up before anyone answered is the caller giving up, which
            // the callee should still see as a call they missed.
            case HUNG_UP -> answeredAt == null ? CallStatus.MISSED : CallStatus.ENDED;
        };
    }

    /**
     * How long the two were connected.
     *
     * <p>Zero for a call nobody answered, rather than the time it spent
     * ringing: a history line reading "2:14" for a call that was never picked
     * up would be a lie.
     */
    public Duration talkTime() {
        if (answeredAt == null || endedAt == null) return Duration.ZERO;
        return Duration.between(answeredAt, endedAt);
    }

    /** Whether this person is one of the two on the call. */
    public boolean involves(UUID userId) {
        return callerId.equals(userId) || calleeId.equals(userId);
    }

    /** The other party, seen from one side. */
    public UUID otherParty(UUID userId) {
        return callerId.equals(userId) ? calleeId : callerId;
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversationId() {
        return conversationId;
    }

    public UUID getCallerId() {
        return callerId;
    }

    public UUID getCalleeId() {
        return calleeId;
    }

    public CallMedia getMedia() {
        return media;
    }

    public CallStatus getStatus() {
        return status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public Instant getAnsweredAt() {
        return answeredAt;
    }

    public Instant getEndedAt() {
        return endedAt;
    }

    public CallEndReason getEndReason() {
        return endReason;
    }
}
