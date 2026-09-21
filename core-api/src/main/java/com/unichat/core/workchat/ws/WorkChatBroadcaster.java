package com.unichat.core.workchat.ws;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.unichat.core.workchat.domain.DirectMessageSentEvent;

/**
 * Delivers a stored message to the recipient's open connections.
 *
 * <p>Waits for the commit: pushing a message whose transaction then rolled back
 * would show the recipient something that does not exist, and no later event
 * would take it away.
 *
 * <p>A recipient with nothing connected simply receives nothing here — the
 * message is already saved, and they will see it when they next open the
 * conversation.
 */
@Component
public class WorkChatBroadcaster {

    /** Clients subscribe to /user/queue/messages; Spring scopes it per user. */
    private static final String DESTINATION = "/queue/messages";

    private static final Logger log = LoggerFactory.getLogger(WorkChatBroadcaster.class);

    private final SimpMessagingTemplate messagingTemplate;

    public WorkChatBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageSent(DirectMessageSentEvent event) {
        messagingTemplate.convertAndSendToUser(
                event.recipientId().toString(), DESTINATION, event.message());
        log.debug("Delivered message {} to {}", event.message().id(), event.recipientId());
    }
}
