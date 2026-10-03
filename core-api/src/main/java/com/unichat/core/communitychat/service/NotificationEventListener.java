package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.unichat.core.communitychat.api.NotificationResponse;
import com.unichat.core.communitychat.domain.MentionEvent;
import com.unichat.core.communitychat.domain.NewReplyEvent;
import com.unichat.core.communitychat.domain.Notification;
import com.unichat.core.communitychat.domain.NotificationRepository;

@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);
    
    private final NotificationRepository notificationRepository;

    public NotificationEventListener(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
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
        log.debug("Saved notification for user {}", event.discussionAuthorId());
    }

    /**
     * Notifies everyone a post or reply named. Mentions are resolved against
     * active workspace members, so this never reaches someone who cannot open
     * the post.
     */
    @Async
    @EventListener
    public void handleMentionEvent(MentionEvent event) {
        for (UUID mentionedUserId : event.mentionedUserIds()) {
            String payload = String.format(
                    "{\"discussionId\": \"%s\", \"replyId\": %s, \"mentionedBy\": \"%s\"}",
                    event.discussionId(),
                    event.replyId() == null ? "null" : "\"" + event.replyId() + "\"",
                    event.authorId());

            notificationRepository.save(new Notification(
                    UUID.randomUUID(),
                    mentionedUserId,
                    "MENTION",
                    event.workspaceId(),
                    payload,
                    Instant.now()));
        }

        if (!event.mentionedUserIds().isEmpty()) {
            log.debug("Saved {} mention notifications for discussion {}",
                    event.mentionedUserIds().size(), event.discussionId());
        }
    }
}
