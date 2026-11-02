package com.unichat.core.workchat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatAttachmentRepository extends JpaRepository<ChatAttachment, UUID> {

    /** One message's files, in the order they were sent. */
    List<ChatAttachment> findByMessageIdOrderByCreatedAtAsc(UUID messageId);

    /**
     * Files for a whole page of messages in one query.
     *
     * <p>A thread is read a page at a time, so loading these per message would
     * be twenty round trips for one screen.
     */
    List<ChatAttachment> findByMessageIdInOrderByCreatedAtAsc(List<UUID> messageIds);

    /**
     * One file, confirmed to belong to the message named in the request.
     *
     * <p>Both ids are matched so that an attachment id cannot be served through
     * a message the caller happens to have access to.
     */
    Optional<ChatAttachment> findByIdAndMessageId(UUID id, UUID messageId);
}
