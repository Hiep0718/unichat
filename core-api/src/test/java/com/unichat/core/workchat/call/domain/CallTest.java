package com.unichat.core.workchat.call.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class CallTest {

    private static final UUID CONVERSATION = UUID.randomUUID();
    private static final UUID CALLER = UUID.randomUUID();
    private static final UUID CALLEE = UUID.randomUUID();
    private static final Instant START = Instant.parse("2026-10-18T09:00:00Z");

    private static Call ringing() {
        return Call.ring(CONVERSATION, CALLER, CALLEE, CallMedia.AUDIO, START);
    }

    @Test
    void shouldStartRingingWithNeitherAnswerNorEnd() {
        Call call = ringing();

        assertEquals(CallStatus.RINGING, call.getStatus());
        assertTrue(call.getStatus().isLive());
        assertEquals(START, call.getStartedAt());
        assertEquals(null, call.getAnsweredAt());
        assertEquals(null, call.getEndedAt());
    }

    @Test
    void shouldCountTalkTimeFromThePickupRatherThanTheRing() {
        Call call = ringing();
        call.answer(START.plusSeconds(12));
        call.finish(CallEndReason.HUNG_UP, START.plusSeconds(72));

        // Twelve seconds of ringing are not sixty seconds of conversation; a
        // history line reading 1:12 for a one minute call would be a lie.
        assertEquals(Duration.ofSeconds(60), call.talkTime());
    }

    @Test
    void shouldReportNoTalkTimeForACallNobodyAnswered() {
        Call call = ringing();
        call.finish(CallEndReason.NO_ANSWER, START.plusSeconds(45));

        assertEquals(Duration.ZERO, call.talkTime());
    }

    @Test
    void shouldTreatGivingUpBeforePickupAsAMissedCall() {
        Call call = ringing();

        // The caller pressed hang up, but from the callee's side nothing
        // distinguishes this from a call they did not reach in time.
        call.finish(CallEndReason.HUNG_UP, START.plusSeconds(5));

        assertEquals(CallStatus.MISSED, call.getStatus());
        assertEquals(CallEndReason.HUNG_UP, call.getEndReason());
    }

    @Test
    void shouldEndRatherThanMissWhenHangingUpAfterPickup() {
        Call call = ringing();
        call.answer(START.plusSeconds(3));
        call.finish(CallEndReason.HUNG_UP, START.plusSeconds(30));

        assertEquals(CallStatus.ENDED, call.getStatus());
    }

    @Test
    void shouldDeriveStatusFromTheReasonSoTheTwoCannotDisagree() {
        Call declined = ringing();
        declined.finish(CallEndReason.DECLINED, START.plusSeconds(2));
        assertEquals(CallStatus.DECLINED, declined.getStatus());

        Call busy = ringing();
        busy.finish(CallEndReason.BUSY, START);
        assertEquals(CallStatus.MISSED, busy.getStatus());

        Call offline = ringing();
        offline.finish(CallEndReason.OFFLINE, START);
        assertEquals(CallStatus.MISSED, offline.getStatus());

        Call failed = ringing();
        failed.answer(START.plusSeconds(1));
        failed.finish(CallEndReason.CONNECTION_FAILED, START.plusSeconds(4));
        assertEquals(CallStatus.FAILED, failed.getStatus());
    }

    @Test
    void shouldKnowWhoIsOnTheCallAndWhoTheOtherPartyIs() {
        Call call = ringing();

        assertTrue(call.involves(CALLER));
        assertTrue(call.involves(CALLEE));
        assertFalse(call.involves(UUID.randomUUID()));
        assertEquals(CALLEE, call.otherParty(CALLER));
        assertEquals(CALLER, call.otherParty(CALLEE));
    }

    @Test
    void shouldCountOnlyRingingAndActiveAsOccupyingTheLine() {
        // Being rung blocks a second call exactly as much as talking does,
        // which is what the "already on a call" check relies on.
        assertTrue(CallStatus.RINGING.isLive());
        assertTrue(CallStatus.ACTIVE.isLive());
        assertFalse(CallStatus.ENDED.isLive());
        assertFalse(CallStatus.DECLINED.isLive());
        assertFalse(CallStatus.MISSED.isLive());
        assertFalse(CallStatus.FAILED.isLive());
    }
}
