package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostAttachmentRepository extends JpaRepository<PostAttachment, UUID> {

    List<PostAttachment> findByDiscussionIdOrderByCreatedAtAsc(UUID discussionId);

    /** Batch load for a page of posts, avoiding a query per post. */
    List<PostAttachment> findByDiscussionIdInOrderByCreatedAtAsc(List<UUID> discussionIds);

    Optional<PostAttachment> findByIdAndDiscussionId(UUID id, UUID discussionId);

    /**
     * Attachments backed by one library document. The same file posted to two
     * threads is deduplicated into a single document, so this returns a list.
     */
    List<PostAttachment> findByDocumentId(UUID documentId);
}
