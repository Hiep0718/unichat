package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.workspace.api.WorkspaceCardStats;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;

/**
 * Card statistics are gathered once per page, not once per card, and a figure
 * nobody has yet is zero rather than absent.
 */
class WorkspaceStatsLoaderTest {

    private DocumentRepository documentRepository;
    private WorkspaceMemberRepository memberRepository;
    private DiscussionRepository discussionRepository;
    private WorkspaceStatsLoader loader;

    private final UUID busy = UUID.randomUUID();
    private final UUID quiet = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        documentRepository = mock(DocumentRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        discussionRepository = mock(DiscussionRepository.class);
        loader = new WorkspaceStatsLoader(documentRepository, memberRepository,
                discussionRepository, Clock.fixed(Instant.parse("2026-09-26T00:00:00Z"), ZoneOffset.UTC));

        when(documentRepository.countGroupedByWorkspaceIds(anyList())).thenReturn(List.of());
        when(memberRepository.countGroupedByWorkspaceIds(anyList(), any())).thenReturn(List.of());
        when(discussionRepository.countRecentGroupedByWorkspaceIds(anyList(), any()))
                .thenReturn(List.of());
        when(memberRepository.findFacesForWorkspaces(anyList(), anyInt())).thenReturn(List.of());
    }

    @Test
    void shouldReportTheDocumentsAGroupActuallyHas() {
        // Arrange: the card used to print a hardcoded 0 for every group, which
        // made a library of six files look like an empty one.
        when(documentRepository.countGroupedByWorkspaceIds(List.of(busy)))
                .thenReturn(List.<Object[]>of(new Object[] { busy, 6L }));

        // Act
        Map<UUID, WorkspaceCardStats> stats = loader.loadFor(List.of(busy));

        // Assert
        assertEquals(6, stats.get(busy).documentCount());
    }

    @Test
    void shouldReportZeroForAGroupNoQueryReturnedARowFor() {
        // Arrange: a grouped count omits workspaces with nothing to count.
        when(documentRepository.countGroupedByWorkspaceIds(List.of(busy, quiet)))
                .thenReturn(List.<Object[]>of(new Object[] { busy, 3L }));

        // Act
        Map<UUID, WorkspaceCardStats> stats = loader.loadFor(List.of(busy, quiet));

        // Assert: present and zero, so the card renders rather than breaking.
        assertEquals(0, stats.get(quiet).documentCount());
        assertEquals(0, stats.get(quiet).memberCount());
        assertTrue(stats.get(quiet).faces().isEmpty());
    }

    @Test
    void shouldSeparateAGroupThatIsBusyFromOneThatHasMerelyBeenBusy() {
        // Arrange: recent posts, not total posts — a group with a long history
        // and nothing this week is dormant and should read that way.
        when(discussionRepository.countRecentGroupedByWorkspaceIds(any(), any()))
                .thenReturn(List.<Object[]>of(new Object[] { busy, 4L }));

        // Act
        Map<UUID, WorkspaceCardStats> stats = loader.loadFor(List.of(busy, quiet));

        // Assert
        assertEquals(4, stats.get(busy).recentPostCount());
        assertEquals(0, stats.get(quiet).recentPostCount());
    }

    @Test
    void shouldAskForRecentPostsFromOneWeekBack() {
        // Act
        loader.loadFor(List.of(busy));

        // Assert
        verify(discussionRepository).countRecentGroupedByWorkspaceIds(
                List.of(busy), Instant.parse("2026-09-19T00:00:00Z"));
    }

    @Test
    void shouldGroupFacesUnderTheWorkspaceTheyBelongTo() {
        // Arrange
        UUID owner = UUID.randomUUID();
        UUID member = UUID.randomUUID();
        when(memberRepository.findFacesForWorkspaces(any(), anyInt())).thenReturn(List.of(
                new Object[] { busy, owner, "Hùng", true, "navy" },
                new Object[] { busy, member, "An", false, null },
                new Object[] { quiet, owner, "Hùng", true, "navy" }));

        // Act
        Map<UUID, WorkspaceCardStats> stats = loader.loadFor(List.of(busy, quiet));

        // Assert: the query's order is preserved, so owners stay first.
        assertEquals(2, stats.get(busy).faces().size());
        assertEquals("Hùng", stats.get(busy).faces().get(0).displayName());
        assertTrue(stats.get(busy).faces().get(0).hasAvatar());
        assertEquals(1, stats.get(quiet).faces().size());
    }

    @Test
    void shouldCountMembersOnlyWhileTheirMembershipIsActive() {
        // Arrange and Act
        loader.loadFor(List.of(busy));

        // Assert: someone removed from a group must not still be counted in it.
        verify(memberRepository).countGroupedByWorkspaceIds(
                List.of(busy), WorkspaceMemberStatus.ACTIVE);
    }

    @Test
    void shouldIssueNoQueriesForAnEmptyPage() {
        // Act
        Map<UUID, WorkspaceCardStats> stats = loader.loadFor(List.of());

        // Assert: an IN () clause on an empty list is both pointless and, on
        // some drivers, invalid SQL.
        assertTrue(stats.isEmpty());
        verify(documentRepository, never()).countGroupedByWorkspaceIds(anyList());
        verify(memberRepository, never()).findFacesForWorkspaces(anyList(), anyInt());
    }
}
