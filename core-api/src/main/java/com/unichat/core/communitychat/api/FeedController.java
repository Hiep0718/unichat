package com.unichat.core.communitychat.api;

import java.util.Map;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.communitychat.service.FeedService;

/**
 * Feed API — aggregated community timeline with search and sorting.
 */
@RestController
@RequestMapping("/api/v1/feed")
public class FeedController {

    /** Matches the pagination ceiling required by the engineering standards. */
    private static final int MAX_PAGE_SIZE = 100;

    private final FeedService feedService;

    public FeedController(FeedService feedService) {
        this.feedService = feedService;
    }

    /** Main feed endpoint with search and sort options. */
    @GetMapping
    public ResponseEntity<Page<FeedPostResponse>> getFeed(
            @RequestParam(defaultValue = "HOT") String sort,
            @RequestParam(defaultValue = "JOINED") String scope,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String range,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        // Cap the page size so a crafted request cannot pull the whole table.
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return ResponseEntity.ok(
                feedService.getFeed(userId, sort, scope, q, range, Math.max(page, 0), safeSize));
    }

    /** Community statistics for sidebar display. */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(feedService.getStats(userId));
    }
}
