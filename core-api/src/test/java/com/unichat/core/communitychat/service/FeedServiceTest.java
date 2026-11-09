package com.unichat.core.communitychat.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.unichat.core.communitychat.domain.BookmarkRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.communitychat.domain.ReactionRepository;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * The feed reads only from groups the caller belongs to, whatever scope a
 * client sends.
 */
class FeedServiceTest {

    private DiscussionRepository discussionRepository;
    private WorkspaceMemberRepository memberRepository;
    private WorkspaceRepository workspaceRepository;
    private FeedService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID memberWorkspace = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        discussionRepository = mock(DiscussionRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        workspaceRepository = mock(WorkspaceRepository.class);
        service = new FeedService(discussionRepository, memberRepository, workspaceRepository,
                mock(UserRepository.class), mock(ReactionRepository.class),
                mock(BookmarkRepository.class), mock(PostAttachmentService.class),
                mock(ReactionService.class));

        when(memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(new WorkspaceMember(memberWorkspace, userId,
                        WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, null)));
        when(discussionRepository.findUnanswered(any(), any(Pageable.class))).thenReturn(Page.empty());
        when(discussionRepository.findBookmarked(any(), any(), any(Pageable.class)))
                .thenReturn(Page.empty());
    }

    @Test
    void retiredPublicScopeFallsBackToTheCallersOwnGroups() {
        service.getFeed(userId, "UNANSWERED", "ALL", null, null, 0, 20);

        verify(discussionRepository).findUnanswered(eq(List.of(memberWorkspace)), any(Pageable.class));
        verify(workspaceRepository, never()).findAll();
    }

    @Test
    void savedScopeReadsBookmarksWithinTheCallersGroups() {
        service.getFeed(userId, "NEW", "SAVED", null, null, 0, 20);

        verify(discussionRepository)
                .findBookmarked(eq(userId), eq(List.of(memberWorkspace)), any(Pageable.class));
    }

    @Test
    void callerWithoutGroupsGetsAnEmptyFeedWithoutQueryingPosts() {
        UUID loner = UUID.randomUUID();

        Page<?> page = service.getFeed(loner, "NEW", "JOINED", null, null, 0, 20);

        assertTrue(page.isEmpty());
        verifyNoInteractions(discussionRepository);
    }
}
