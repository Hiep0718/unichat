package com.unichat.core.communitychat.api;

import java.util.List;
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
 * Feed API — aggregated community timeline with search, tags, and sorting.
 */
@RestController
@RequestMapping("/api/v1/feed")
public class FeedController {

    private final FeedService feedService;

    public FeedController(FeedService feedService) {
        this.feedService = feedService;
    }

    /** Main feed endpoint with search, tag filter, and sort options. */
    @GetMapping
    public ResponseEntity<Page<FeedPostResponse>> getFeed(
            @RequestParam(defaultValue = "HOT") String sort,
            @RequestParam(defaultValue = "JOINED") String scope,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tag,
            @RequestParam(required = false) String range,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(
                feedService.getFeed(userId, sort, scope, q, tag, range, page, size));
    }

    /** Trending tags — top tags by frequency in the last 7 days. */
    @GetMapping("/trending-tags")
    public ResponseEntity<List<Map<String, Object>>> getTrendingTags(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(feedService.getTrendingTags(limit));
    }

    /** Community statistics for sidebar display. */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(feedService.getStats());
    }
}
