package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.communitychat.api.ComposeSuggestion;
import com.unichat.core.communitychat.domain.Discussion;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Someone about to post is shown questions the group already answered, and told
 * whether the assistant has anything to read here.
 */
class ComposeSuggestionServiceTest {

    private DiscussionRepository discussionRepository;
    private DocumentRepository documentRepository;
    private WorkspaceMemberRepository memberRepository;
    private ComposeSuggestionService service;

    private final UUID workspaceId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        discussionRepository = mock(DiscussionRepository.class);
        documentRepository = mock(DocumentRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        service = new ComposeSuggestionService(
                discussionRepository, documentRepository, memberRepository);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(mock(WorkspaceMember.class)));
        when(documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId)))
                .thenReturn(List.of(UUID.randomUUID(), UUID.randomUUID()));
    }

    @Test
    void shouldOfferMatchingPostsSoTheQuestionIsNotAskedTwice() {
        // Arrange
        when(discussionRepository.searchByKeyword(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page(discussion("Cách tạo chỉ mục trong PostgreSQL", 4, true)));

        // Act
        ComposeSuggestion suggestion = service.suggest(workspaceId, userId, "tạo chỉ mục");

        // Assert
        assertEquals(1, suggestion.similarPosts().size());
        assertEquals("Cách tạo chỉ mục trong PostgreSQL", suggestion.similarPosts().get(0).title());
        assertTrue(suggestion.similarPosts().get(0).resolved());
    }

    @Test
    void shouldPutAnsweredPostsFirstBecauseTheyActuallyResolveTheQuestion() {
        // Arrange: the unanswered one comes back first from the search.
        when(discussionRepository.searchByKeyword(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page(
                        discussion("Chỉ mục chạy chậm?", 1, false),
                        discussion("Chỉ mục B-Tree hoạt động thế nào", 7, true)));

        // Act
        ComposeSuggestion suggestion = service.suggest(workspaceId, userId, "chỉ mục");

        // Assert
        assertTrue(suggestion.similarPosts().get(0).resolved());
        assertEquals("Chỉ mục B-Tree hoạt động thế nào", suggestion.similarPosts().get(0).title());
    }

    @Test
    void shouldNotSearchOnADraftTooShortToMeanAnything() {
        // Act
        ComposeSuggestion suggestion = service.suggest(workspaceId, userId, "sql");

        // Assert: no query at all, rather than a page of noise.
        assertTrue(suggestion.similarPosts().isEmpty());
        verify(discussionRepository, never())
                .searchByKeyword(anyList(), anyString(), any(Pageable.class));
    }

    @Test
    void shouldTreatAMissingDraftAsNoSearch() {
        // Act
        ComposeSuggestion suggestion = service.suggest(workspaceId, userId, null);

        // Assert
        assertTrue(suggestion.similarPosts().isEmpty());
        verify(discussionRepository, never())
                .searchByKeyword(anyList(), anyString(), any(Pageable.class));
    }

    @Test
    void shouldReportTheLibrarySizeEvenWhenTheDraftIsTooShort() {
        // Arrange and Act: the reader still deserves to know the assistant has
        // something to read before they decide how to phrase the post.
        ComposeSuggestion suggestion = service.suggest(workspaceId, userId, "a");

        // Assert
        assertEquals(2, suggestion.documentCount());
    }

    @Test
    void shouldCountOnlyDocumentsTheAssistantIsAllowedToRead() {
        // Arrange: an empty library means pending or rejected contributions only.
        when(documentRepository.findAllowedDocumentIdsForWorkspaces(List.of(workspaceId)))
                .thenReturn(List.of());
        when(discussionRepository.searchByKeyword(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page());

        // Act
        ComposeSuggestion suggestion = service.suggest(workspaceId, userId, "chỉ mục CSDL");

        // Assert
        assertEquals(0, suggestion.documentCount());
    }

    @Test
    void shouldRefuseSomeoneWhoIsNotAMemberOfTheGroup() {
        // Arrange
        UUID outsider = UUID.randomUUID();
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, outsider, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        // Act and Assert
        assertThrows(AuthorizationError.class,
                () -> service.suggest(workspaceId, outsider, "chỉ mục"));
    }

    private Page<Discussion> page(Discussion... discussions) {
        return new PageImpl<>(List.of(discussions));
    }

    private Discussion discussion(String title, int replyCount, boolean resolved) {
        Discussion discussion = new Discussion(UUID.randomUUID(), workspaceId, userId, title,
                "body", "QUESTION", false, "OPEN", Instant.now());
        for (int i = 0; i < replyCount; i++) {
            discussion.incrementReplyCount();
        }
        if (resolved) {
            discussion.setAcceptedReplyId(UUID.randomUUID());
        }
        return discussion;
    }
}
