package com.unichat.core.workchat.service;

import java.io.ByteArrayInputStream;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.document.storage.StoragePort;
import com.unichat.core.shared.image.SquareImageEncoder;
import com.unichat.core.workchat.domain.ConversationListChangedEvent;
import com.unichat.core.workchat.domain.DirectConversation;
import com.unichat.core.workchat.domain.DirectConversationRepository;

/**
 * A group's picture.
 *
 * <p>Separate from {@link GroupConversationService}, which administers who is
 * in a group, for the reason {@link com.unichat.core.user.service.AvatarService}
 * is separate from the user service: storing an image is a different job from
 * the entity that points at it, and the two together outgrow one class.
 *
 * <p>Setting it is the owner's alone, the same rule as renaming. Reading it is
 * open to every participant, because everyone in the group sees the group.
 */
@Service
public class GroupAvatarService {

    /** What a picture is called in the messages a member reads. */
    private static final String SUBJECT = "Ảnh nhóm";

    /** What the endpoint serves, whatever the upload was. */
    public static final String STORED_MEDIA_TYPE = SquareImageEncoder.STORED_MEDIA_TYPE;

    private static final Logger log = LoggerFactory.getLogger(GroupAvatarService.class);

    private final DirectConversationRepository conversationRepository;
    private final ConversationAccess conversationAccess;
    private final StoragePort storagePort;
    private final ApplicationEventPublisher eventPublisher;

    public GroupAvatarService(DirectConversationRepository conversationRepository,
                              ConversationAccess conversationAccess,
                              StoragePort storagePort,
                              ApplicationEventPublisher eventPublisher) {
        this.conversationRepository = conversationRepository;
        this.conversationAccess = conversationAccess;
        this.storagePort = storagePort;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Stores a new picture for a group, replacing whatever it had.
     *
     * @throws ValidationError when the file is empty, too large, not an
     *                         accepted type, or not a decodable image
     */
    @Transactional
    public void upload(UUID callerId, UUID conversationId, MultipartFile file) {
        DirectConversation group = conversationAccess.requireGroupOwner(callerId, conversationId);

        byte[] square = SquareImageEncoder.encode(file, SUBJECT);
        String storageKey = "group-avatars/" + conversationId + "/" + UUID.randomUUID() + ".png";
        storagePort.store(storageKey, new ByteArrayInputStream(square), square.length);

        String previous = group.replaceAvatar(storageKey);
        conversationRepository.save(group);

        announce(callerId, conversationId);
        deleteQuietly(previous);
    }

    /** Removes the picture, leaving the drawn fallback. */
    @Transactional
    public void remove(UUID callerId, UUID conversationId) {
        DirectConversation group = conversationAccess.requireGroupOwner(callerId, conversationId);

        String previous = group.replaceAvatar(null);
        conversationRepository.save(group);

        announce(callerId, conversationId);
        deleteQuietly(previous);
    }

    /**
     * Reads a group's picture.
     *
     * @throws NotFoundError when the group has none, and equally when the
     *                       caller does not take part in it
     */
    @Transactional(readOnly = true)
    public byte[] read(UUID callerId, UUID conversationId) {
        DirectConversation conversation =
                conversationAccess.requireParticipant(callerId, conversationId);
        if (!conversation.hasAvatarImage()) {
            throw new NotFoundError("Nhóm chưa có ảnh đại diện");
        }
        return storagePort.retrieve(conversation.getAvatarStorageKey());
    }

    /**
     * Tells the other members their conversation list is out of date, the way
     * a rename does — otherwise they keep the old picture until a reload.
     */
    private void announce(UUID callerId, UUID conversationId) {
        Set<UUID> recipients = conversationAccess.recipientsOf(conversationId, callerId);
        if (!recipients.isEmpty()) {
            eventPublisher.publishEvent(
                    new ConversationListChangedEvent(recipients, conversationId));
        }
    }

    /**
     * Removes the picture this one replaced. A failure here leaves an orphaned
     * blob, which costs storage but must not fail the upload the owner just
     * made — the new picture is already saved.
     */
    private void deleteQuietly(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            storagePort.delete(storageKey);
        } catch (RuntimeException e) {
            log.warn("Could not delete the replaced group picture; it is now orphaned", e);
        }
    }
}
