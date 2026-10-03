package com.unichat.core.communitychat.api;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.communitychat.service.BookmarkService;

/**
 * REST controller for bookmark toggle operations.
 */
@RestController
@RequestMapping("/api/v1/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    /**
     * Toggle bookmark on a discussion post.
     *
     * @return {"bookmarked": true/false}
     */
    @PostMapping("/{discussionId}")
    public ResponseEntity<Map<String, Boolean>> toggleBookmark(
            @PathVariable UUID discussionId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        boolean isBookmarked = bookmarkService.toggle(userId, discussionId);
        return ResponseEntity.ok(Map.of("bookmarked", isBookmarked));
    }
}
