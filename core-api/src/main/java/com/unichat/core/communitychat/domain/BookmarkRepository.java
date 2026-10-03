package com.unichat.core.communitychat.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for bookmark persistence.
 */
@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    Optional<Bookmark> findByUserIdAndDiscussionId(UUID userId, UUID discussionId);

    Page<Bookmark> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<Bookmark> findByUserIdAndDiscussionIdIn(UUID userId, List<UUID> discussionIds);

    void deleteByUserIdAndDiscussionId(UUID userId, UUID discussionId);
}
