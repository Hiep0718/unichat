package com.unichat.core.communitychat.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.communitychat.api.SearchResults;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.document.domain.Document;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.document.domain.DocumentStatus;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;

/**
 * One search box over both halves of the product.
 *
 * <p>Without this, finding something means remembering whether it was said in a
 * thread or uploaded as a file — a distinction the person searching does not
 * have in mind.
 *
 * <p>Scope is the caller's active memberships, resolved here and never widened
 * afterwards, so a search can only ever reach groups they belong to.
 */
@Service
@Transactional(readOnly = true)
public class UnifiedSearchService {

    /** Below this, a query matches too much to be worth running. */
    private static final int MIN_QUERY_LENGTH = 2;
    private static final int MAX_RESULTS = 20;
    private static final int SNIPPET_LENGTH = 160;

    private final DiscussionRepository discussionRepository;
    private final DocumentRepository documentRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final WorkspaceRepository workspaceRepository;

    public UnifiedSearchService(DiscussionRepository discussionRepository,
                                DocumentRepository documentRepository,
                                WorkspaceMemberRepository memberRepository,
                                WorkspaceRepository workspaceRepository) {
        this.discussionRepository = discussionRepository;
        this.documentRepository = documentRepository;
        this.memberRepository = memberRepository;
        this.workspaceRepository = workspaceRepository;
    }

    /**
     * Searches posts and documents across every group the caller belongs to.
     *
     * @param limit caller's requested size, clamped to {@value #MAX_RESULTS}
     */
    public SearchResults search(UUID userId, String rawQuery, int limit) {
        String query = rawQuery == null ? "" : rawQuery.trim();
        if (query.length() < MIN_QUERY_LENGTH) {
            return SearchResults.empty();
        }

        List<UUID> workspaceIds = joinedWorkspaceIds(userId);
        if (workspaceIds.isEmpty()) {
            return SearchResults.empty();
        }

        PageRequest page = PageRequest.of(0, Math.min(Math.max(limit, 1), MAX_RESULTS));
        List<Discussion> posts =
                discussionRepository.searchByKeyword(workspaceIds, query, page).getContent();
        List<Document> documents =
                documentRepository.searchByNameInWorkspaces(workspaceIds, query, page).getContent();

        Map<UUID, String> names = workspaceNames(workspaceIds);
        return new SearchResults(
                posts.stream().map(post -> toPostHit(post, names)).toList(),
                documents.stream().map(document -> toDocumentHit(document, names)).toList());
    }

    private List<UUID> joinedWorkspaceIds(UUID userId) {
        return memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE)
                .stream()
                .map(WorkspaceMember::getWorkspaceId)
                .toList();
    }

    /** One lookup for every group in the results, rather than one per hit. */
    private Map<UUID, String> workspaceNames(List<UUID> workspaceIds) {
        return workspaceRepository.findAllById(workspaceIds).stream()
                .collect(Collectors.toMap(Workspace::getId, Workspace::getName));
    }

    private static SearchResults.PostHit toPostHit(Discussion post, Map<UUID, String> names) {
        return new SearchResults.PostHit(
                post.getId(),
                post.getWorkspaceId(),
                names.getOrDefault(post.getWorkspaceId(), "Nhóm"),
                post.getTitle(),
                snippetOf(post.getBody()),
                post.getReplyCount(),
                post.getAcceptedReplyId() != null,
                post.getCreatedAt());
    }

    private static SearchResults.DocumentHit toDocumentHit(Document document, Map<UUID, String> names) {
        return new SearchResults.DocumentHit(
                document.getId(),
                document.getWorkspaceId(),
                names.getOrDefault(document.getWorkspaceId(), "Nhóm"),
                document.getOriginalName(),
                document.getMediaType(),
                document.getByteSize(),
                // Matches the rule retrieval itself applies: only a processed
                // document is ever handed to the assistant.
                DocumentStatus.PROCESSED.equals(document.getStatus()),
                document.getCreatedAt());
    }

    /** Enough of the body to recognise the post, not enough to read it here. */
    private static String snippetOf(String body) {
        if (body == null) {
            return "";
        }
        String flattened = body.replaceAll("\\s+", " ").trim();
        return flattened.length() <= SNIPPET_LENGTH
                ? flattened
                : flattened.substring(0, SNIPPET_LENGTH) + "…";
    }
}
