package com.unichat.core.workchat.call.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.domain.CallEndReason;
import com.unichat.core.workchat.call.domain.CallMedia;

class CallStateMachineTest {

    private static final UUID CALLER = UUID.randomUUID();
    private static final UUID CALLEE = UUID.randomUUID();
    private static final UUID STRANGER = UUID.randomUUID();
    private static final Instant NOW = Instant.parse("2026-10-18T09:00:00Z");

    private final CallStateMachine machine = new CallStateMachine();

    private static Call ringing() {
        return Call.ring(UUID.randomUUID(), CALLER, CALLEE, CallMedia.AUDIO, NOW);
    }

    private static Call active() {
        Call call = ringing();
        call.answer(NOW.plusSeconds(2));
        return call;
    }

    @Test
    void shouldLetTheCalleeAnswerARingingCall() {
        assertDoesNotThrow(() -> machine.requireCanAnswer(ringing(), CALLEE));
    }

    @Test
    void shouldNotLetTheCallerAnswerTheirOwnCall() {
        // Answering your own call would connect you to yourself.
        assertThrows(AuthorizationError.class, () -> machine.requireCanAnswer(ringing(), CALLER));
    }

    @Test
    void shouldNotLetAStrangerAnswerSomeoneElsesCall() {
        assertThrows(AuthorizationError.class, () -> machine.requireCanAnswer(ringing(), STRANGER));
    }

    @Test
    void shouldRefuseToAnswerACallThatIsNoLongerRinging() {
        // Picked up on another device, or the caller already gave up.
        assertThrows(ConflictError.class, () -> machine.requireCanAnswer(active(), CALLEE));
    }

    @Test
    void shouldLetTheCalleeDeclineButNotTheCaller() {
        assertDoesNotThrow(() -> machine.requireCanDecline(ringing(), CALLEE));
        assertThrows(AuthorizationError.class, () -> machine.requireCanDecline(ringing(), CALLER));
    }

    @Test
    void shouldLetEitherSideHangUpWhileRingingOrTalking() {
        // Giving up mid-ring is as ordinary as hanging up mid-conversation.
        assertDoesNotThrow(() -> machine.requireCanHangUp(ringing(), CALLER));
        assertDoesNotThrow(() -> machine.requireCanHangUp(ringing(), CALLEE));
        assertDoesNotThrow(() -> machine.requireCanHangUp(active(), CALLER));
        assertDoesNotThrow(() -> machine.requireCanHangUp(active(), CALLEE));
    }

    @Test
    void shouldRefuseToHangUpACallThatIsAlreadyOver() {
        Call finished = active();
        finished.finish(CallEndReason.HUNG_UP, NOW.plusSeconds(30));

        assertThrows(ConflictError.class, () -> machine.requireCanHangUp(finished, CALLER));
    }

    @Test
    void shouldRefuseSignallingFromSomeoneNotOnTheCall() {
        // The call id travels in a destination the client writes, so this is
        // the only thing stopping anyone signed in from pushing an offer into
        // a call they are not part of.
        assertThrows(AuthorizationError.class, () -> machine.requireCanSignal(active(), STRANGER));
    }

    @Test
    void shouldRefuseSignallingForACallThatHasEnded() {
        Call declined = ringing();
        declined.finish(CallEndReason.DECLINED, NOW.plusSeconds(3));

        assertThrows(ConflictError.class, () -> machine.requireCanSignal(declined, CALLER));
    }

    @Test
    void shouldAllowSignallingWhileRingingBecauseTheOfferComesFirst() {
        // The offer is sent before the callee has picked up; requiring ACTIVE
        // would deadlock every call.
        assertDoesNotThrow(() -> machine.requireCanSignal(ringing(), CALLER));
        assertDoesNotThrow(() -> machine.requireCanSignal(ringing(), CALLEE));
    }
}
