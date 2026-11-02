package com.unichat.core.workchat.ws;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.unichat.core.workchat.api.MessageResponse;
import com.unichat.core.workchat.domain.ConversationListChangedEvent;
import com.unichat.core.workchat.domain.DirectMessageSentEvent;

/**
 * Routing a stored message to the right person's queue.
 *
 * <p>This is the whole of the realtime path that can be checked without two
 * browsers: that the recipient — not the sender — is the one addressed, and on
 * the destination the client actually subscribes to. Getting either wrong
 * delivers someone else's message, or none at all, and neither shows up in any
 * other test.
 */
class WorkChatBroadcasterTest {

    private SimpMessagingTemplate messagingTemplate;
    private WorkChatBroadcaster broadcaster;

    private final UUID sender = UUID.randomUUID();
    private final UUID recipient = UUID.randomUUID();
    private final UUID otherRecipient = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        broadcaster = new WorkChatBroadcaster(messagingTemplate);
    }

    private MessageResponse messageFrom(UUID authorId) {
        return new MessageResponse(
                UUID.randomUUID(), UUID.randomUUID(), authorId, "Hùng",
                "Ba giờ chiều nhé", false, Instant.now(), List.of());
    }

    @Test
    void shouldDeliverToTheRecipientRatherThanTheSender() {
        // Arrange: the event names who should receive it, and the sender's own
        // client already has the message from the request it just made.
        MessageResponse message = messageFrom(sender);

        // Act
        broadcaster.onMessageSent(new DirectMessageSentEvent(Set.of(recipient), message));

        // Assert
        verify(messagingTemplate)
                .convertAndSendToUser(recipient.toString(), "/queue/messages", message);
        verify(messagingTemplate, org.mockito.Mockito.never())
                .convertAndSendToUser(org.mockito.ArgumentMatchers.eq(sender.toString()),
                        any(String.class), any());
    }

    @Test
    void shouldAddressTheDestinationTheClientSubscribesTo() {
        // Arrange: the browser subscribes to /user/queue/messages, and Spring
        // prefixes /user itself — sending to the full path would deliver to a
        // destination nothing is listening on.
        MessageResponse message = messageFrom(sender);

        // Act
        broadcaster.onMessageSent(new DirectMessageSentEvent(Set.of(recipient), message));

        // Assert
        verify(messagingTemplate)
                .convertAndSendToUser(any(String.class), org.mockito.ArgumentMatchers.eq("/queue/messages"), any());
    }

    @Test
    void shouldReachEveryRecipientOfAGroupMessage() {
        // Arrange: a group message goes to one user destination each
        // rather than to a topic, because the STOMP interceptor does not
        // check subscriptions and a topic per conversation could be
        // subscribed to by anyone logged in.
        MessageResponse message = messageFrom(sender);

        // Act
        broadcaster.onMessageSent(
                new DirectMessageSentEvent(Set.of(recipient, otherRecipient), message));

        // Assert
        verify(messagingTemplate)
                .convertAndSendToUser(recipient.toString(), "/queue/messages", message);
        verify(messagingTemplate)
                .convertAndSendToUser(otherRecipient.toString(), "/queue/messages", message);
    }

    @Test
    void shouldTellClientsSeparatelyWhenOnlyTheirConversationListChanged() {
        // Arrange: being added to a group sends no message, so without
        // this the group would not appear until the page was reloaded.
        UUID conversationId = UUID.randomUUID();

        // Act
        broadcaster.onConversationListChanged(
                new ConversationListChangedEvent(Set.of(recipient), conversationId));

        // Assert
        verify(messagingTemplate).convertAndSendToUser(
                recipient.toString(), "/queue/conversations", conversationId.toString());
    }
}
