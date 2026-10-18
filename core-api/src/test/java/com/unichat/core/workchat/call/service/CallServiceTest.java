package com.unichat.core.workchat.call.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import com.unichat.core.common.error.ValidationError;
import com.unichat.core.workchat.call.domain.Call;
import com.unichat.core.workchat.call.domain.CallEndReason;
import com.unichat.core.workchat.call.domain.CallMedia;
import com.unichat.core.workchat.call.domain.CallRepository;
import com.unichat.core.workchat.call.domain.CallStatus;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.service.ConversationAccess;
import com.unichat.core.workchat.ws.PresenceTracker;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CallServiceTest {

    private static final UUID CONVERSATION = UUID.randomUUID();
    // Ordered so that LOW is the caller and HIGH the callee, matching how a
    // one-to-one conversation stores its pair.
    private static final UUID LOW = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID HIGH = UUID.fromString("00000000-0000-0000-0000-000000000002");

    @Mock private CallRepository callRepository;
    @Mock private ConversationAccess conversationAccess;
    @Mock private PresenceTracker presenceTracker;
    @Mock private ApplicationEventPublisher events;
    @Mock private DirectConversation conversation;

    private CallService service;

    @BeforeEach
    void setUp() {
        service = new CallService(callRepository, conversationAccess,
                new CallStateMachine(), presenceTracker, events);

        when(conversation.isGroup()).thenReturn(false);
        when(conversation.getParticipantLow()).thenReturn(LOW);
        when(conversation.getParticipantHigh()).thenReturn(HIGH);
        when(conversationAccess.requireParticipant(any(), any())).thenReturn(conversation);
        when(callRepository.save(any(Call.class))).thenAnswer(call -> call.getArgument(0));
        when(presenceTracker.isOnline(any())).thenReturn(true);
        when(callRepository.hasLiveCall(any())).thenReturn(false);
    }

    @Test
    void shouldRingTheOtherPersonInTheConversation() {
        Call call = service.start(LOW, CONVERSATION, CallMedia.AUDIO);

        // The callee is derived from the conversation, never taken from the
        // client, so nobody can ring someone they do not share a thread with.
        assertEquals(HIGH, call.getCalleeId());
        assertEquals(CallStatus.RINGING, call.getStatus());
    }

    @Test
    void shouldRecordAMissedCallRatherThanFailWhenTheCalleeIsOffline() {
        when(presenceTracker.isOnline(HIGH)).thenReturn(false);

        Call call = service.start(LOW, CONVERSATION, CallMedia.AUDIO);

        // Refusing would leave the caller with nothing and the callee with no
        // sign anyone tried, which is not how a phone behaves.
        assertEquals(CallStatus.MISSED, call.getStatus());
        assertEquals(CallEndReason.OFFLINE, call.getEndReason());
    }

    @Test
    void shouldRecordABusyCallWhenTheCalleeIsAlreadyOnOne() {
        when(callRepository.hasLiveCall(HIGH)).thenReturn(true);

        Call call = service.start(LOW, CONVERSATION, CallMedia.VIDEO);

        assertEquals(CallStatus.MISSED, call.getStatus());
        assertEquals(CallEndReason.BUSY, call.getEndReason());
    }

    @Test
    void shouldTellTheCallerRatherThanTheCalleeWhenNobodyCouldBeRung() {
        when(presenceTracker.isOnline(HIGH)).thenReturn(false);

        service.start(LOW, CONVERSATION, CallMedia.AUDIO);

        ArgumentCaptor<CallChangedEvent> sent = ArgumentCaptor.forClass(CallChangedEvent.class);
        verify(events).publishEvent(sent.capture());
        // Ringing a phone that was never reachable would be worse than silence.
        assertEquals(LOW, sent.getValue().recipientId());
    }

    @Test
    void shouldRefuseToStartASecondCallWhileTheCallerIsOnOne() {
        when(callRepository.hasLiveCall(LOW)).thenReturn(true);

        // Unlike the callee being busy, this is the caller's own mistake and
        // they can act on it, so it is an error rather than a missed call.
        assertThrows(ValidationError.class,
                () -> service.start(LOW, CONVERSATION, CallMedia.AUDIO));
        verify(callRepository, never()).save(any(Call.class));
    }

    @Test
    void shouldRefuseToCallAGroupConversation() {
        when(conversation.isGroup()).thenReturn(true);

        assertThrows(ValidationError.class,
                () -> service.start(LOW, CONVERSATION, CallMedia.AUDIO));
    }

    @Test
    void shouldNotifyTheOtherSideWhenSomebodyHangsUp() {
        Call ringing = Call.ring(CONVERSATION, LOW, HIGH, CallMedia.AUDIO, java.time.Instant.now());
        when(callRepository.findById(ringing.getId())).thenReturn(java.util.Optional.of(ringing));

        service.hangUp(LOW, ringing.getId());

        ArgumentCaptor<CallChangedEvent> sent = ArgumentCaptor.forClass(CallChangedEvent.class);
        verify(events).publishEvent(sent.capture());
        // Not the person who pressed it: their client already knows, and the
        // echo would race with their own teardown.
        assertEquals(HIGH, sent.getValue().recipientId());
    }

    @Test
    void shouldTellTheCallerWhenTheCalleeAnswers() {
        Call ringing = Call.ring(CONVERSATION, LOW, HIGH, CallMedia.AUDIO, java.time.Instant.now());
        when(callRepository.findById(ringing.getId())).thenReturn(java.util.Optional.of(ringing));

        Call answered = service.answer(HIGH, ringing.getId());

        assertEquals(CallStatus.ACTIVE, answered.getStatus());
        ArgumentCaptor<CallChangedEvent> sent = ArgumentCaptor.forClass(CallChangedEvent.class);
        verify(events).publishEvent(sent.capture());
        assertEquals(LOW, sent.getValue().recipientId());
    }
}
