package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.api.CreateInviteRequest;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceInvite;
import com.unichat.core.workspace.domain.WorkspaceInviteRepository;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class WorkspaceInviteServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-14T09:00:00Z");

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository memberRepository;
    private WorkspaceInviteRepository inviteRepository;
    private UserRepository userRepository;
    private Clock clock;
    private WorkspaceInviteService service;

    private final UUID ownerId = UUID.randomUUID();
    private final UUID workspaceId = UUID.randomUUID();
    private final UUID guestId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        inviteRepository = mock(WorkspaceInviteRepository.class);
        userRepository = mock(UserRepository.class);
        clock = Clock.fixed(NOW, ZoneOffset.UTC);
        service = new WorkspaceInviteService(
                workspaceRepository, memberRepository, inviteRepository, userRepository, clock);

        when(inviteRepository.save(any(WorkspaceInvite.class)))
                .thenAnswer(call -> call.getArgument(0));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(new User(
                ownerId, "owner@unichat.edu.vn", "hash", SystemRole.USER, UserStatus.ACTIVE, NOW)));
    }

    /* ---------- Issuing ---------- */

    @Test
    void shouldReturnTheRawTokenExactlyOnceWhenIssuingALink() {
        givenSharedWorkspaceOwnedByCaller();

        var response = service.create(ownerId, workspaceId, request(WorkspaceRole.VIEWER, 7, 1));

        assertNotNull(response.token());
        assertTrue(response.active());
        assertEquals(NOW.plus(Duration.ofDays(7)), response.expiresAt());
    }

    @Test
    void shouldNeverIssueTheSameTokenTwice() {
        givenSharedWorkspaceOwnedByCaller();

        var first = service.create(ownerId, workspaceId, request(WorkspaceRole.VIEWER, 7, 1));
        var second = service.create(ownerId, workspaceId, request(WorkspaceRole.VIEWER, 7, 1));

        assertNotEquals(first.token(), second.token());
    }

    @Test
    void shouldWithholdTheTokenWhenListingLinksCreatedEarlier() {
        givenSharedWorkspaceOwnedByCaller();
        when(inviteRepository.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId))
                .thenReturn(List.of(invite(WorkspaceRole.VIEWER, 1, NOW.plus(Duration.ofDays(1)))));

        var listed = service.list(ownerId, workspaceId);

        // Only the hash is stored, so a listing that showed a token would be
        // showing something invented.
        assertNull(listed.get(0).token());
    }

    @Test
    void shouldRefuseALinkForAPrivateWorkspace() {
        givenWorkspaceOwnedByCaller(WorkspaceVisibility.PRIVATE);

        assertThrows(ValidationError.class,
                () -> service.create(ownerId, workspaceId, request(WorkspaceRole.VIEWER, 7, 1)));
        verify(inviteRepository, never()).save(any());
    }

    @Test
    void shouldRefuseALinkThatWouldHandOverOwnership() {
        givenSharedWorkspaceOwnedByCaller();

        // A link can be forwarded by anyone who receives it.
        assertThrows(ValidationError.class,
                () -> service.create(ownerId, workspaceId, request(WorkspaceRole.OWNER, 7, 1)));
    }

    @Test
    void shouldRefuseALinkFromSomeoneWhoIsNotTheOwner() {
        var workspace = new Workspace(workspaceId, ownerId, "Nhóm", "",
                WorkspaceVisibility.SHARED, false, NOW);
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, guestId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(
                        workspaceId, guestId, WorkspaceRole.EDITOR,
                        WorkspaceMemberStatus.ACTIVE, ownerId)));

        assertThrows(AuthorizationError.class,
                () -> service.create(guestId, workspaceId, request(WorkspaceRole.VIEWER, 7, 1)));
    }

    /* ---------- Redeeming ---------- */

    @Test
    void shouldDescribeTheGroupToSomeoneHoldingALiveLink() {
        String token = givenIssuedToken(WorkspaceRole.VIEWER, 1);

        var preview = service.preview(token);

        assertEquals("Nhóm", preview.workspaceName());
        assertEquals(WorkspaceRole.VIEWER, preview.role());
    }

    @Test
    void shouldNotSpendTheInvitationMerelyByPreviewingIt() {
        String token = givenIssuedToken(WorkspaceRole.VIEWER, 1);
        // Issuing the link saved it once; only what happens next is in question.
        clearInvocations(inviteRepository);

        service.preview(token);
        service.preview(token);

        // Chat clients fetch link previews on their own; if a preview counted,
        // an unfurl bot would burn the invitation before its recipient opened it.
        verify(inviteRepository, never()).save(any());
    }

    @Test
    void shouldAddTheCallerWithTheRoleTheLinkCarries() {
        String token = givenIssuedToken(WorkspaceRole.EDITOR, 5);
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, guestId, WorkspaceMemberStatus.ACTIVE)).thenReturn(Optional.empty());

        var joined = service.accept(guestId, token);

        assertEquals(workspaceId, joined.workspaceId());
        verify(memberRepository).save(any(WorkspaceMember.class));
        verify(workspaceRepository).save(any(Workspace.class));
    }

    @Test
    void shouldCountTheUseOnlyWhenSomeoneActuallyJoins() {
        String token = givenIssuedToken(WorkspaceRole.VIEWER, 2);
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, guestId, WorkspaceMemberStatus.ACTIVE)).thenReturn(Optional.empty());

        service.accept(guestId, token);

        assertEquals(1, issuedInvite.getUsedCount());
    }

    @Test
    void shouldRefuseALinkThatHasRunOutOfUses() {
        String token = givenIssuedToken(WorkspaceRole.VIEWER, 1);
        issuedInvite.recordUse();

        assertThrows(NotFoundError.class, () -> service.preview(token));
    }

    @Test
    void shouldRefuseALinkPastItsExpiry() {
        String token = givenIssuedToken(WorkspaceRole.VIEWER, 1);
        service = new WorkspaceInviteService(workspaceRepository, memberRepository,
                inviteRepository, userRepository,
                Clock.fixed(NOW.plus(Duration.ofDays(400)), ZoneOffset.UTC));

        assertThrows(NotFoundError.class, () -> service.preview(token));
    }

    @Test
    void shouldRefuseARevokedLink() {
        String token = givenIssuedToken(WorkspaceRole.VIEWER, 5);
        issuedInvite.revoke(NOW);

        assertThrows(NotFoundError.class, () -> service.preview(token));
    }

    @Test
    void shouldAnswerAnUnknownTokenTheSameWayAsADeadOne() {
        when(inviteRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        // Telling the two apart would let a stranger probe which links exist.
        var error = assertThrows(NotFoundError.class, () -> service.preview("made-up-token"));
        assertTrue(error.getMessage().contains("không hợp lệ hoặc đã hết hạn"));
    }

    @Test
    void shouldRefuseToAddSomeoneWhoIsAlreadyIn() {
        String token = givenIssuedToken(WorkspaceRole.VIEWER, 5);
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, guestId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(
                        workspaceId, guestId, WorkspaceRole.VIEWER,
                        WorkspaceMemberStatus.ACTIVE, ownerId)));

        assertThrows(ConflictError.class, () -> service.accept(guestId, token));
    }

    /* ---------- Fixtures ---------- */

    private WorkspaceInvite issuedInvite;

    private CreateInviteRequest request(WorkspaceRole role, int days, int uses) {
        return new CreateInviteRequest(role, days, uses);
    }

    private Workspace givenWorkspaceOwnedByCaller(WorkspaceVisibility visibility) {
        var workspace = new Workspace(workspaceId, ownerId, "Nhóm", "", visibility, false, NOW);
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(
                workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(new WorkspaceMember(
                        workspaceId, ownerId, WorkspaceRole.OWNER,
                        WorkspaceMemberStatus.ACTIVE, ownerId)));
        return workspace;
    }

    private void givenSharedWorkspaceOwnedByCaller() {
        givenWorkspaceOwnedByCaller(WorkspaceVisibility.SHARED);
    }

    /**
     * Issues a real link through the service, then wires the repository to
     * return it for lookups — so the test exercises the real hashing rather
     * than a token the test invented.
     */
    private String givenIssuedToken(WorkspaceRole role, int uses) {
        givenSharedWorkspaceOwnedByCaller();
        when(inviteRepository.save(any(WorkspaceInvite.class))).thenAnswer(call -> {
            issuedInvite = call.getArgument(0);
            return issuedInvite;
        });

        String token = service.create(ownerId, workspaceId, request(role, 7, uses)).token();
        when(inviteRepository.findByTokenHash(any())).thenAnswer(call ->
                Optional.ofNullable(issuedInvite));
        return token;
    }

    private WorkspaceInvite invite(WorkspaceRole role, int uses, Instant expiresAt) {
        return new WorkspaceInvite(UUID.randomUUID(), workspaceId, "hash", role,
                ownerId, NOW, expiresAt, uses);
    }
}
