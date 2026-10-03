package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What the composer can tell someone before they post.
 *
 * <p>Two questions are worth answering while a draft is still being typed: has
 * this already been asked, and does the group hold anything the assistant could
 * answer from.
 *
 * @param similarPosts  existing posts matching the draft, most useful first
 * @param documentCount documents in the group's library the assistant can read
 */
public record ComposeSuggestion(
        List<SimilarPost> similarPosts,
        int documentCount
) {

    /** An empty suggestion, for a draft too short to search on. */
    public static ComposeSuggestion none(int documentCount) {
        return new ComposeSuggestion(List.of(), documentCount);
    }

    /**
     * An existing post offered as a possible duplicate.
     *
     * @param resolved whether an answer was accepted, which is what makes a
     *                 suggestion worth following rather than merely related
     */
    public record SimilarPost(
            UUID id,
            String title,
            int replyCount,
            boolean resolved,
            Instant createdAt
    ) {}
}
