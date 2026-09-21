package com.unichat.core.communitychat.service;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.communitychat.api.ComposeSuggestion;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Helps someone about to post find out their question is already answered.
 *
 * <p>A group where the same question is asked five times is a group where
 * nobody finds the answer the sixth time. Searching as the draft is typed costs
 * one indexed query and saves a duplicate thread.
 */
@Service
@Transactional(readOnly = true)
public class ComposeSuggestionService {

    /** Below this, a draft is too vague to search on without returning noise. */
    private static final int MIN_QUERY_LENGTH = 5;
    private static final int MAX_SUGGESTIONS = 5;

    private final DiscussionRepository discussionRepository;
    private final DocumentRepository documentRepository;
    private final WorkspaceMemberRepository memberRepository;

    public ComposeSuggestionService(DiscussionRepository discussionRepository,
                                    DocumentRepository documentRepository,
                                    WorkspaceMemberRepository memberRepository) {
        this.discussionRepository = discussionRepository;
        this.documentRepository = documentRepository;
        this.memberRepository = memberRepository;
    }

    /**
     * Suggests existing posts matching a draft, and reports how much the
     * assistant has to read in this group.
     *
     * @param draft the title being typed; blank or very short returns no posts
     */
    public ComposeSuggestion suggest(UUID workspaceId, UUID userId, String draft) {
        requireMembership(workspaceId, userId);

        int documentCount = documentRepository
                .findAllowedDocumentIdsForWorkspaces(List.of(workspaceId)).size();

        String query = draft == null ? "" : draft.trim();
        if (query.length() < MIN_QUERY_LENGTH) {
            return ComposeSuggestion.none(documentCount);
        }

        List<Discussion> matches = discussionRepository
                .searchByKeyword(List.of(workspaceId), query, PageRequest.of(0, MAX_SUGGESTIONS))
                .getContent();

        return new ComposeSuggestion(rankedFor(matches), documentCount);
    }

    /**
     * Puts answered posts first: a thread with an accepted answer is worth
     * following, where a merely related one still leaves the question open.
     */
    private static List<ComposeSuggestion.SimilarPost> rankedFor(List<Discussion> matches) {
        return matches.stream()
                .map(ComposeSuggestionService::toSimilarPost)
                .sorted(Comparator.comparing(ComposeSuggestion.SimilarPost::resolved).reversed())
                .toList();
    }

    private static ComposeSuggestion.SimilarPost toSimilarPost(Discussion discussion) {
        return new ComposeSuggestion.SimilarPost(
                discussion.getId(),
                discussion.getTitle(),
                discussion.getReplyCount(),
                discussion.getAcceptedReplyId() != null,
                discussion.getCreatedAt());
    }

    private void requireMembership(UUID workspaceId, UUID userId) {
        memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new AuthorizationError("Bạn không phải thành viên của nhóm này"));
    }
}
