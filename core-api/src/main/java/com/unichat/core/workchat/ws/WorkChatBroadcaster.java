package com.unichat.core.workchat.ws;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.unichat.core.workchat.domain.ConversationListChangedEvent;
import com.unichat.core.workchat.domain.DirectMessageSentEvent;

/**
 * Delivers a stored message to every recipient's open connections.
 *
 * <p>Waits for the commit: pushing a message whose transaction then rolled back
 * would show the recipient something that does not exist, and no later event
 * would take it away.
 *
 * <p>Fans out to one user destination per recipient rather than publishing to a
 * topic named by the conversation. {@link StompAuthChannelInterceptor}
 * authenticates the connection but does not check subscriptions, so a topic per
 * conversation could be subscribed to by anyone logged in. Spring scopes a user
 * destination to the connected principal, which leaves no such opening.
 *
 * <p>A recipient with nothing connected simply receives nothing here — the
 * message is already saved, and they will see it when they next open the
 * conversation.
 */
@Component
public class WorkChatBroadcaster {

    /** Clients subscribe to /user/queue/messages; Spring scopes it per user. */
    private static final String MESSAGES = "/queue/messages";

    /** Tells a client its list of conversations is out of date. */
    private static final String CONVERSATIONS = "/queue/conversations";

    private static final Logger log = LoggerFactory.getLogger(WorkChatBroadcaster.class);

    private final SimpMessagingTemplate messagingTemplate;

    public WorkChatBroadcaster(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMessageSent(DirectMessageSentEvent event) {
        event.recipientIds().forEach(recipientId -> messagingTemplate.convertAndSendToUser(
                recipientId.toString(), MESSAGES, event.message()));
        log.debug("Delivered message {} to {} recipients",
                event.message().id(), event.recipientIds().size());
    }

    /**
     * Tells people their conversation list changed when no message was sent —
     * added to a group, removed from one, or it was renamed.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onConversationListChanged(ConversationListChangedEvent event) {
        event.recipientIds().forEach(recipientId -> messagingTemplate.convertAndSendToUser(
                recipientId.toString(), CONVERSATIONS, event.conversationId().toString()));
        log.debug("Told {} clients that conversation {} changed",
                event.recipientIds().size(), event.conversationId());
    }
}
