package com.unichat.core.workchat.call.ws;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workchat.call.api.CallEventMessage;
import com.unichat.core.workchat.call.service.CallChangedEvent;

/**
 * Tells one person their call changed.
 *
 * <p>Waits for the commit, for the reason {@code WorkChatBroadcaster} does:
 * ringing a phone for a call whose transaction then rolled back would leave
 * someone answering a call that does not exist.
 *
 * <p>Sends to a user destination rather than a topic named by the call. The
 * STOMP interceptor authenticates the connection but does not police
 * subscriptions, so a topic per call could be subscribed to by anyone signed
 * in — and the frames that would follow carry the other party's network
 * addresses.
 */
@Component
public class CallBroadcaster {

    /** Clients subscribe to /user/queue/calls; Spring scopes it per user. */
    static final String CALLS = "/queue/calls";

    private static final Logger log = LoggerFactory.getLogger(CallBroadcaster.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    public CallBroadcaster(SimpMessagingTemplate messagingTemplate, UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCallChanged(CallChangedEvent event) {
        messagingTemplate.convertAndSendToUser(
                event.recipientId().toString(),
                CALLS,
                CallEventMessage.forRecipient(event.call(), event.recipientId(),
                        nameOf(event.call().otherParty(event.recipientId()))));

        // The id and the state, never the signalling: an offer carries the
        // other party's addresses and has no business in a log.
        log.debug("Call {} is now {}", event.call().getId(), event.call().getStatus());
    }

    /**
     * The other party's name for the ringing panel.
     *
     * <p>Falls back rather than failing: a missing name costs a nicer
     * label, and throwing here would abandon a call that is otherwise fine
     * — this runs after the commit, so the row already says it is ringing.
     */
    private String nameOf(UUID userId) {
        return userRepository.findById(userId).map(User::getDisplayName).orElse("Người dùng");
    }
}
