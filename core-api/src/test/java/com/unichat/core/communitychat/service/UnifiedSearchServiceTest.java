package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

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
 * One search reaches posts and documents at once, and only inside the groups
 * the person searching actually belongs to.
 */
class UnifiedSearchServiceTest {

    private DiscussionRepository discussionRepository;
    private DocumentRepository documentRepository;
    private WorkspaceMemberRepository memberRepository;
    private WorkspaceRepository workspaceRepository;
    private UnifiedSearchService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        discussionRepository = mock(DiscussionRepository.class);
        documentRepository = mock(DocumentRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        workspaceRepository = mock(WorkspaceRepository.class);
        service = new UnifiedSearchService(discussionRepository, documentRepository,
                memberRepository, workspaceRepository);
        stubWorkspaceName("Nhóm học tập");

        WorkspaceMember member = mock(WorkspaceMember.class);
        when(member.getWorkspaceId()).thenReturn(workspaceId);
        when(memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(member));

        when(discussionRepository.searchByKeyword(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(emptyPage());
        when(documentRepository.searchByNameInWorkspaces(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(emptyPage());
    }

    @Test
    void shouldReturnPostsAndDocumentsFromTheSameQuery() {
        // Arrange
        when(discussionRepository.searchByKeyword(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page(discussion("Chỉ mục chạy chậm", "Nội dung bài viết", false)));
        when(documentRepository.searchByNameInWorkspaces(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page(document("chi-muc.pdf", DocumentStatus.PROCESSED)));

        // Act
        SearchResults results = service.search(userId, "chỉ mục", 10);

        // Assert
        assertEquals(1, results.posts().size());
        assertEquals(1, results.documents().size());
        assertEquals("Chỉ mục chạy chậm", results.posts().get(0).title());
        assertEquals("chi-muc.pdf", results.documents().get(0).originalName());
    }

    @Test
    void shouldSearchOnlyInsideTheGroupsTheCallerBelongsTo() {
        // Act
        service.search(userId, "chỉ mục", 10);

        // Assert: the workspace ids come from membership, never from the caller.
        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.forClass(List.class);
        verify(discussionRepository).searchByKeyword(captor.capture(), anyString(), any(Pageable.class));
        assertEquals(List.of(workspaceId), captor.getValue());
    }

    @Test
    void shouldReturnNothingForSomeoneWhoHasJoinedNoGroups() {
        // Arrange
        when(memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of());

        // Act
        SearchResults results = service.search(userId, "chỉ mục", 10);

        // Assert: no query is run at all.
        assertTrue(results.posts().isEmpty());
        assertTrue(results.documents().isEmpty());
        verify(discussionRepository, never())
                .searchByKeyword(anyList(), anyString(), any(Pageable.class));
    }

    @Test
    void shouldNotRunAQueryTooShortToNarrowAnything() {
        // Act
        SearchResults results = service.search(userId, "a", 10);

        // Assert
        assertTrue(results.posts().isEmpty());
        verify(documentRepository, never())
                .searchByNameInWorkspaces(anyList(), anyString(), any(Pageable.class));
    }

    @Test
    void shouldMarkOnlyProcessedDocumentsAsReadableByTheAssistant() {
        // Arrange: a contribution still awaiting approval is not retrievable.
        when(documentRepository.searchByNameInWorkspaces(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page(
                        document("da-duyet.pdf", DocumentStatus.PROCESSED),
                        document("cho-duyet.pdf", DocumentStatus.PENDING_APPROVAL)));

        // Act
        SearchResults results = service.search(userId, "duyet", 10);

        // Assert
        assertTrue(results.documents().get(0).readableByAi());
        assertFalse(results.documents().get(1).readableByAi());
    }

    @Test
    void shouldNameTheGroupSoAResultSaysWhereItLives() {
        // Arrange
        stubWorkspaceName("Cơ sở dữ liệu");
        when(discussionRepository.searchByKeyword(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page(discussion("Chỉ mục", "body", false)));

        // Act
        SearchResults results = service.search(userId, "chỉ mục", 10);

        // Assert
        assertEquals("Cơ sở dữ liệu", results.posts().get(0).workspaceName());
    }

    @Test
    void shouldShortenALongBodyIntoASnippet() {
        // Arrange
        String longBody = "x".repeat(400);
        when(discussionRepository.searchByKeyword(anyList(), anyString(), any(Pageable.class)))
                .thenReturn(page(discussion("Tiêu đề", longBody, false)));

        // Act
        SearchResults results = service.search(userId, "tiêu đề", 10);

        // Assert
        String snippet = results.posts().get(0).snippet();
        assertTrue(snippet.length() < longBody.length());
        assertTrue(snippet.endsWith("…"));
    }

    @Test
    void shouldClampAnOversizedLimitRatherThanTrustingTheCaller() {
        // Act
        service.search(userId, "chỉ mục", 5000);

        // Assert
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(discussionRepository).searchByKeyword(anyList(), anyString(), captor.capture());
        assertEquals(20, captor.getValue().getPageSize());
    }

    private <T> Page<T> emptyPage() {
        return new PageImpl<>(List.of());
    }

    @SafeVarargs
    private <T> Page<T> page(T... items) {
        return new PageImpl<>(List.of(items));
    }

    private Discussion discussion(String title, String body, boolean resolved) {
        Discussion discussion = new Discussion(UUID.randomUUID(), workspaceId, userId, title,
                body, "QUESTION", false, "OPEN", Instant.now());
        if (resolved) {
            discussion.setAcceptedReplyId(UUID.randomUUID());
        }
        return discussion;
    }

    private Document document(String name, DocumentStatus status) {
        return new Document(UUID.randomUUID(), workspaceId, "key", name, "application/pdf",
                1024L, "sha", status, userId, Instant.now());
    }

    /** Names the one group these results live in. */
    private void stubWorkspaceName(String name) {
        Workspace workspace = mock(Workspace.class);
        when(workspace.getId()).thenReturn(workspaceId);
        when(workspace.getName()).thenReturn(name);
        when(workspaceRepository.findAllById(anyIterable())).thenReturn(List.of(workspace));
    }
}
