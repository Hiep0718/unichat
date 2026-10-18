package com.unichat.core.workchat.call.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.domain.CallEndReason;
import com.unichat.core.workchat.call.domain.CallMedia;
import com.unichat.core.workchat.call.domain.CallRepository;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.service.ConversationAccess;
import com.unichat.core.workchat.ws.PresenceTracker;

/**
 * Starting, answering and ending calls.
 *
 * <p>Only the lifecycle lives here. The offers, answers and ICE candidates
 * that set a call up go over the socket through {@code CallSignalRelay} and
 * are never stored: they are many, short-lived, and meaningless once the call
 * is over.
 *
 * <p>Who may talk to whom is not re-decided here.
 * {@link ConversationAccess#requireParticipant} is the one home for that
 * question, and a call is simply another thing two people in a conversation
 * may do.
 */
@Service
@Transactional
public class CallService {

    private final CallRepository callRepository;
    private final ConversationAccess conversationAccess;
    private final CallStateMachine stateMachine;
    private final PresenceTracker presenceTracker;
    private final ApplicationEventPublisher events;

    public CallService(CallRepository callRepository,
                       ConversationAccess conversationAccess,
                       CallStateMachine stateMachine,
                       PresenceTracker presenceTracker,
                       ApplicationEventPublisher events) {
        this.callRepository = callRepository;
        this.conversationAccess = conversationAccess;
        this.stateMachine = stateMachine;
        this.presenceTracker = presenceTracker;
        this.events = events;
    }

    /**
     * Rings the other person in a one-to-one conversation.
     *
     * <p>A call that cannot connect is still recorded rather than refused.
     * Someone who is offline or already busy should leave a missed call behind
     * them, the same as a phone does; returning an error instead would leave
     * the caller with nothing and the callee with no idea anyone tried.
     *
     * @throws ValidationError if the conversation is a group, or the caller is
     *                         already on a call
     */
    public Call start(UUID callerId, UUID conversationId, CallMedia media) {
        DirectConversation conversation =
                conversationAccess.requireParticipant(callerId, conversationId);

        if (conversation.isGroup()) {
            throw new ValidationError("Hiện chỉ hỗ trợ gọi giữa hai người");
        }
        if (callRepository.hasLiveCall(callerId)) {
            throw new ValidationError("Bạn đang có một cuộc gọi khác");
        }

        UUID calleeId = otherParty(conversation, callerId);
        Instant now = Instant.now();
        Call call = callRepository.save(Call.ring(conversationId, callerId, calleeId, media, now));

        CallEndReason refusal = whyCannotRing(calleeId);
        if (refusal != null) {
            call.finish(refusal, now);
            publishTo(callerId, call);
            return call;
        }

        publishTo(calleeId, call);
        return call;
    }

    /** The callee picked up. */
    public Call answer(UUID calleeId, UUID callId) {
        Call call = require(callId);
        stateMachine.requireCanAnswer(call, calleeId);

        call.answer(Instant.now());
        publishTo(call.getCallerId(), call);
        return call;
    }

    /** The callee refused. */
    public Call decline(UUID calleeId, UUID callId) {
        Call call = require(callId);
        stateMachine.requireCanDecline(call, calleeId);

        call.finish(CallEndReason.DECLINED, Instant.now());
        publishTo(call.getCallerId(), call);
        return call;
    }

    /**
     * One side hung up.
     *
     * <p>The other side is told, not the one who pressed it: their own client
     * already knows, and sending it back would race with their own teardown.
     */
    public Call hangUp(UUID actorId, UUID callId) {
        Call call = require(callId);
        stateMachine.requireCanHangUp(call, actorId);

        call.finish(CallEndReason.HUNG_UP, Instant.now());
        publishTo(call.otherParty(actorId), call);
        return call;
    }

    /**
     * Marks a call whose media never came up.
     *
     * <p>Reported by a client rather than detected here: only the browsers
     * know whether the peer connection succeeded, because the media never
     * passes through this server.
     */
    public Call reportFailed(UUID actorId, UUID callId) {
        Call call = require(callId);
        stateMachine.requireCanHangUp(call, actorId);

        call.finish(CallEndReason.CONNECTION_FAILED, Instant.now());
        publishTo(call.otherParty(actorId), call);
        return call;
    }

    /** One conversation's calls, newest first, for the history panel. */
    @Transactional(readOnly = true)
    public Page<Call> history(UUID userId, UUID conversationId, Pageable pageable) {
        conversationAccess.requireParticipant(userId, conversationId);
        return callRepository.findByConversationIdOrderByStartedAtDesc(conversationId, pageable);
    }

    /**
     * Loads a call and confirms this person is on it.
     *
     * <p>Used by the signalling relay, which must re-check on every frame
     * because a call id is a value the client supplies.
     */
    @Transactional(readOnly = true)
    public Call requireSignalling(UUID actorId, UUID callId) {
        Call call = require(callId);
        stateMachine.requireCanSignal(call, actorId);
        return call;
    }

    /** Why the callee cannot be rung, or null when they can. */
    private CallEndReason whyCannotRing(UUID calleeId) {
        if (!presenceTracker.isOnline(calleeId)) return CallEndReason.OFFLINE;
        if (callRepository.hasLiveCall(calleeId)) return CallEndReason.BUSY;
        return null;
    }

    private UUID otherParty(DirectConversation conversation, UUID callerId) {
        return conversation.getParticipantLow().equals(callerId)
                ? conversation.getParticipantHigh()
                : conversation.getParticipantLow();
    }

    private Call require(UUID callId) {
        return callRepository.findById(callId)
                .orElseThrow(() -> new NotFoundError("Không tìm thấy cuộc gọi"));
    }

    private void publishTo(UUID recipientId, Call call) {
        events.publishEvent(new CallChangedEvent(recipientId, call));
    }
}
