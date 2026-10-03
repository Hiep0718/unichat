package com.unichat.core.communitychat.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What one search across the caller's groups turned up.
 *
 * <p>Posts and documents are returned side by side rather than merged into one
 * ranked list: they are not comparable, and a reader looking for a file wants
 * to see files, not a file ranked below three discussions that mention it.
 *
 * @param posts     discussions matching the query
 * @param documents library documents whose name matches
 */
public record SearchResults(
        List<PostHit> posts,
        List<DocumentHit> documents
) {

    /** An empty result, for a query too short to search on. */
    public static SearchResults empty() {
        return new SearchResults(List.of(), List.of());
    }

    /**
     * A post matching the query.
     *
     * @param workspaceName shown because results span every group the caller is
     *                      in, so a title alone does not say where it lives
     * @param resolved      whether an answer was accepted
     */
    public record PostHit(
            UUID id,
            UUID workspaceId,
            String workspaceName,
            String title,
            String snippet,
            int replyCount,
            boolean resolved,
            Instant createdAt
    ) {}

    /**
     * A document matching the query.
     *
     * @param readableByAi whether the assistant can cite it, which is the part
     *                     a reader cannot infer from the file name
     */
    public record DocumentHit(
            UUID id,
            UUID workspaceId,
            String workspaceName,
            String originalName,
            String mediaType,
            long byteSize,
            boolean readableByAi,
            Instant createdAt
    ) {}
}
