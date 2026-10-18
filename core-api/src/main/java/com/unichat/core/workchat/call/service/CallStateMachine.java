package com.unichat.core.workchat.call.service;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.domain.CallStatus;

/**
 * What may happen to a call, and who may do it.
 *
 * <p>Kept apart from {@link CallService} so the rules can be read and tested
 * without a database, in the same way {@code ConversationAccess} is the one
 * home for who may see a conversation.
 *
 * <p>Two different rules are enforced here and they are deliberately not
 * merged. Whether the call is in a state that allows the action is a
 * {@link ConflictError}; whether this person is allowed to take it is an
 * {@link AuthorizationError}. Collapsing them would tell the wrong story in
 * the logs and show the wrong message on screen.
 */
@Component
public class CallStateMachine {

    /**
     * Confirms the callee may answer this call now.
     *
     * @throws AuthorizationError if anyone other than the callee tries; the
     *                            caller answering their own call would connect
     *                            them to themselves
     * @throws ConflictError      if it is no longer ringing — already answered
     *                            on another device, or already given up on
     */
    public void requireCanAnswer(Call call, UUID actorId) {
        requireCallee(call, actorId, "nhận");
        requireStatus(call, CallStatus.RINGING, "Cuộc gọi không còn đổ chuông");
    }

    /**
     * Confirms the callee may refuse this call now.
     *
     * @throws AuthorizationError if the caller tries to decline their own call
     * @throws ConflictError      if it is no longer ringing
     */
    public void requireCanDecline(Call call, UUID actorId) {
        requireCallee(call, actorId, "từ chối");
        requireStatus(call, CallStatus.RINGING, "Cuộc gọi không còn đổ chuông");
    }

    /**
     * Confirms this person may hang up.
     *
     * <p>Either side may, and from either live state: giving up while it is
     * still ringing is as ordinary as hanging up mid-conversation.
     *
     * @throws AuthorizationError if the person is not on the call
     * @throws ConflictError      if the call is already over
     */
    public void requireCanHangUp(Call call, UUID actorId) {
        requireParticipant(call, actorId, "kết thúc");
        if (!call.getStatus().isLive()) {
            throw new ConflictError("Cuộc gọi đã kết thúc");
        }
    }

    /**
     * Confirms this person may relay signalling for the call.
     *
     * <p>Checked on every frame rather than once at the start. A call id is a
     * UUID that a client supplies, and the socket carries no other proof of
     * which call a frame belongs to, so taking it on trust would let anyone
     * holding an id push an offer into someone else's call.
     *
     * @throws AuthorizationError if the person is not on the call
     * @throws ConflictError      if the call is over, since signalling for a
     *                            dead call can only confuse the other side
     */
    public void requireCanSignal(Call call, UUID actorId) {
        requireParticipant(call, actorId, "gửi tín hiệu cho");
        if (!call.getStatus().isLive()) {
            throw new ConflictError("Cuộc gọi đã kết thúc");
        }
    }

    private void requireCallee(Call call, UUID actorId, String action) {
        if (!call.getCalleeId().equals(actorId)) {
            throw new AuthorizationError("Chỉ người được gọi mới " + action + " được cuộc gọi này");
        }
    }

    private void requireParticipant(Call call, UUID actorId, String action) {
        if (!call.involves(actorId)) {
            throw new AuthorizationError("Bạn không ở trong cuộc gọi này nên không " + action + " được");
        }
    }

    private void requireStatus(Call call, CallStatus expected, String message) {
        if (call.getStatus() != expected) {
            throw new ConflictError(message);
        }
    }
}
