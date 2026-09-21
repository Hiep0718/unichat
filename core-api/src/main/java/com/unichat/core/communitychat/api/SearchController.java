package com.unichat.core.communitychat.api;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.unichat.core.communitychat.service.UnifiedSearchService;

/**
 * Search across posts and documents in the caller's groups.
 */
@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private static final int DEFAULT_LIMIT = 10;

    private final UnifiedSearchService searchService;

    public SearchController(UnifiedSearchService searchService) {
        this.searchService = searchService;
    }

    /**
     * Finds posts and documents matching a query.
     *
     * <p>Scope comes from the caller's memberships, not from a parameter, so
     * there is no workspace id a client could substitute to widen it.
     *
     * @param q     the search text; shorter than two characters returns nothing
     * @param limit results per kind, clamped by the service
     */
    @GetMapping
    public ResponseEntity<SearchResults> search(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "" + DEFAULT_LIMIT) int limit,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return ResponseEntity.ok(searchService.search(userId, q, limit));
    }
}
