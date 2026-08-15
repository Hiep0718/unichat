package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.unichat.core.communitychat.api.NotificationResponse;
import com.unichat.core.communitychat.domain.NewReplyEvent;
import com.unichat.core.communitychat.domain.Notification;
import com.unichat.core.communitychat.domain.NotificationRepository;

@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);
    
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationEventListener(NotificationRepository notificationRepository, SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Async
    @EventListener
    public void handleNewReplyEvent(NewReplyEvent event) {
        // Do not notify the author if they reply to their own discussion
        if (event.replyAuthorId().equals(event.discussionAuthorId())) {
            return;
        }

        String payload = String.format("{\"discussionId\": \"%s\", \"replyId\": \"%s\", \"replyAuthorId\": \"%s\"}", 
                event.discussionId(), event.replyId(), event.replyAuthorId());

        Notification notification = new Notification(
                UUID.randomUUID(),
                event.discussionAuthorId(), // Send to discussion author
                "DISCUSSION_REPLY",
                event.workspaceId(),
                payload,
                Instant.now()
        );

        notificationRepository.save(notification);
        
        // Push real-time notification to the discussion author
        String destination = "/user/" + event.discussionAuthorId().toString() + "/queue/notifications";
        try {
            messagingTemplate.convertAndSend(destination, NotificationResponse.from(notification));
            log.debug("Sent real-time notification to {}", event.discussionAuthorId());
        } catch (Exception e) {
            log.error("Failed to send real-time notification via STOMP", e);
        }
    }
}
