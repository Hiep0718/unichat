package com.unichat.core.communitychat.service;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.domain.Bookmark;
import com.unichat.core.communitychat.domain.BookmarkRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.common.error.NotFoundError;

/**
 * Manages user bookmarks on discussion posts.
 */
@Service
@Transactional(readOnly = true)
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final DiscussionRepository discussionRepository;

    public BookmarkService(BookmarkRepository bookmarkRepository,
                           DiscussionRepository discussionRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.discussionRepository = discussionRepository;
    }

    /**
     * Toggles a bookmark: creates if absent, deletes if present.
     *
     * @return true if bookmarked, false if removed
     */
    @Transactional
    public boolean toggle(UUID userId, UUID discussionId) {
        discussionRepository.findById(discussionId)
                .orElseThrow(() -> new NotFoundError("Discussion not found"));

        return bookmarkRepository.findByUserIdAndDiscussionId(userId, discussionId)
                .map(existing -> {
                    bookmarkRepository.delete(existing);
                    return false;
                })
                .orElseGet(() -> {
                    bookmarkRepository.save(new Bookmark(
                            UUID.randomUUID(), userId, discussionId, Instant.now()));
                    return true;
                });
    }

    /** Lists bookmarked discussion IDs for a user (paginated). */
    public Page<Bookmark> listBookmarks(UUID userId, int page, int size) {
        return bookmarkRepository.findByUserIdOrderByCreatedAtDesc(
                userId, PageRequest.of(page, size));
    }
}
