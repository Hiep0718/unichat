package com.unichat.core.user.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyIterable;
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

import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.communitychat.domain.DiscussionReplyRepository;
import com.unichat.core.communitychat.domain.DiscussionRepository;
import com.unichat.core.document.domain.DocumentRepository;
import com.unichat.core.user.api.MemberProfile;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * A profile shows only what the viewer already has reach over: the groups the
 * two share, and what the subject contributed inside them.
 */
class MemberProfileServiceTest {

    private UserRepository userRepository;
    private WorkspaceMemberRepository memberRepository;
    private WorkspaceRepository workspaceRepository;
    private DocumentRepository documentRepository;
    private DiscussionRepository discussionRepository;
    private DiscussionReplyRepository replyRepository;
    private MemberProfileService service;

    private final UUID viewer = UUID.randomUUID();
    private final UUID subject = UUID.randomUUID();
    private final UUID sharedGroup = UUID.randomUUID();
    private final UUID privateGroup = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        workspaceRepository = mock(WorkspaceRepository.class);
        documentRepository = mock(DocumentRepository.class);
        discussionRepository = mock(DiscussionRepository.class);
        replyRepository = mock(DiscussionReplyRepository.class);
        service = new MemberProfileService(userRepository, memberRepository, workspaceRepository,
                documentRepository, discussionRepository, replyRepository);

        when(userRepository.findById(subject)).thenReturn(Optional.of(
                new User(subject, "lan@example.com", "hash",
                        SystemRole.USER, UserStatus.ACTIVE, Instant.now())));
    }

    @Test
    void shouldShowOnlyTheGroupsBothPeopleBelongTo() {
        // Arrange: the subject is in two groups; the viewer shares only one.
        givenMemberships(subject, membership(sharedGroup, WorkspaceRole.OWNER),
                membership(privateGroup, WorkspaceRole.VIEWER));
        givenMemberships(viewer, membership(sharedGroup, WorkspaceRole.VIEWER));
        givenWorkspaceNames();

        // Act
        MemberProfile profile = service.profileOf(viewer, subject);

        // Assert
        assertEquals(1, profile.sharedGroups().size());
        assertEquals(sharedGroup, profile.sharedGroups().get(0).workspaceId());
    }

    @Test
    void shouldReportOwnershipSoTheGroupsSomeoneRunsAreVisible() {
        // Arrange
        givenMemberships(subject, membership(sharedGroup, WorkspaceRole.OWNER));
        givenMemberships(viewer, membership(sharedGroup, WorkspaceRole.VIEWER));
        givenWorkspaceNames();

        // Act
        MemberProfile profile = service.profileOf(viewer, subject);

        // Assert
        assertEquals("OWNER", profile.sharedGroups().get(0).role());
    }

    @Test
    void shouldHideAMemberWhoSharesNoGroupRatherThanShowingAnEmptyProfile() {
        // Arrange: found-but-empty would still confirm the account exists.
        givenMemberships(subject, membership(privateGroup, WorkspaceRole.VIEWER));
        givenMemberships(viewer, membership(sharedGroup, WorkspaceRole.VIEWER));

        // Act and Assert
        assertThrows(NotFoundError.class, () -> service.profileOf(viewer, subject));
    }

    @Test
    void shouldCountContributionsOnlyInsideTheSharedGroups() {
        // Arrange
        givenMemberships(subject, membership(sharedGroup, WorkspaceRole.EDITOR),
                membership(privateGroup, WorkspaceRole.VIEWER));
        givenMemberships(viewer, membership(sharedGroup, WorkspaceRole.VIEWER));
        givenWorkspaceNames();
        when(documentRepository.countContributedBy(subject, List.of(sharedGroup))).thenReturn(12L);
        when(documentRepository.countApprovedFrom(subject, List.of(sharedGroup))).thenReturn(9L);
        when(discussionRepository.countAcceptedAnswersBy(subject, List.of(sharedGroup))).thenReturn(7L);

        // Act
        MemberProfile profile = service.profileOf(viewer, subject);

        // Assert: the private group is never passed to the counting queries.
        assertEquals(12L, profile.contributions().documentsContributed());
        assertEquals(9L, profile.contributions().documentsApproved());
        assertEquals(7L, profile.contributions().answersAccepted());
    }

    @Test
    void shouldShowAllOwnGroupsWhenAMemberLooksAtTheirOwnProfile() {
        // Arrange
        givenMemberships(subject, membership(sharedGroup, WorkspaceRole.OWNER),
                membership(privateGroup, WorkspaceRole.VIEWER));
        givenWorkspaceNames();

        // Act
        MemberProfile profile = service.profileOf(subject, subject);

        // Assert
        assertEquals(2, profile.sharedGroups().size());
        assertTrue(profile.self());
    }

    @Test
    void shouldNotOfferToMessageYourself() {
        // Arrange
        givenMemberships(subject, membership(sharedGroup, WorkspaceRole.OWNER));
        givenWorkspaceNames();

        // Act
        MemberProfile profile = service.profileOf(subject, subject);

        // Assert
        assertFalse(profile.canMessage());
    }

    @Test
    void shouldOfferToMessageSomeoneInASharedGroup() {
        // Arrange
        givenMemberships(subject, membership(sharedGroup, WorkspaceRole.VIEWER));
        givenMemberships(viewer, membership(sharedGroup, WorkspaceRole.VIEWER));
        givenWorkspaceNames();

        // Act
        MemberProfile profile = service.profileOf(viewer, subject);

        // Assert
        assertTrue(profile.canMessage());
    }

    @Test
    void shouldCarryTheMentionHandleSoAViewerKnowsWhatToType() {
        // Arrange
        givenMemberships(subject, membership(sharedGroup, WorkspaceRole.VIEWER));
        givenMemberships(viewer, membership(sharedGroup, WorkspaceRole.VIEWER));
        givenWorkspaceNames();

        // Act
        MemberProfile profile = service.profileOf(viewer, subject);

        // Assert: the handle stays on the email, not the display name.
        assertEquals("lan", profile.handle());
    }

    @Test
    void shouldReportAMissingMemberAsNotFound() {
        // Arrange
        UUID ghost = UUID.randomUUID();
        when(userRepository.findById(ghost)).thenReturn(Optional.empty());

        // Act and Assert
        assertThrows(NotFoundError.class, () -> service.profileOf(viewer, ghost));
        verify(memberRepository, never()).findByUserIdAndStatus(any(), any());
    }

    /* ---------- Arrange helpers ---------- */

    private void givenMemberships(UUID userId, WorkspaceMember... memberships) {
        when(memberRepository.findByUserIdAndStatus(userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(memberships));
    }

    private WorkspaceMember membership(UUID workspaceId, WorkspaceRole role) {
        WorkspaceMember member = mock(WorkspaceMember.class);
        when(member.getWorkspaceId()).thenReturn(workspaceId);
        when(member.getRole()).thenReturn(role);
        return member;
    }

    private void givenWorkspaceNames() {
        Workspace shared = mock(Workspace.class);
        when(shared.getId()).thenReturn(sharedGroup);
        when(shared.getName()).thenReturn("Cơ sở dữ liệu");
        Workspace other = mock(Workspace.class);
        when(other.getId()).thenReturn(privateGroup);
        when(other.getName()).thenReturn("Nhóm riêng");
        when(workspaceRepository.findAllById(anyIterable())).thenReturn(List.of(shared, other));
    }
}
