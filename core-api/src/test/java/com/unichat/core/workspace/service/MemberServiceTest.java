package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.api.InviteMemberRequest;
import com.unichat.core.workspace.api.MemberResponse;
import com.unichat.core.workspace.api.UpdateMemberRoleRequest;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class MemberServiceTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository memberRepository;
    private UserRepository userRepository;
    private MemberService memberService;

    private UUID ownerId;
    private UUID workspaceId;
    private WorkspaceMember ownerMember;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        memberRepository = mock(WorkspaceMemberRepository.class);
        userRepository = mock(UserRepository.class);
        memberService = new MemberService(workspaceRepository, memberRepository, userRepository);

        ownerId = UUID.randomUUID();
        workspaceId = UUID.randomUUID();
        ownerMember = new WorkspaceMember(workspaceId, ownerId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId);
    }

    /* ─── getMembers ─────────────────────────────────────────── */

    @Test
    void shouldReturnActiveMembersWhenCallerIsOwner() {
        // Arrange
        var memberId = UUID.randomUUID();
        var member = new WorkspaceMember(workspaceId, memberId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, ownerId);
        var user = createUser(memberId, "member@test.com");

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(memberRepository.findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(List.of(ownerMember, member));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(createUser(ownerId, "owner@test.com")));
        when(userRepository.findById(memberId)).thenReturn(Optional.of(user));

        // Act
        List<MemberResponse> result = memberService.getMembers(ownerId, workspaceId);

        // Assert
        assertEquals(2, result.size());
    }

    @Test
    void shouldThrowAuthorizationErrorWhenNonOwnerGetsMembers() {
        // Arrange
        var editorId = UUID.randomUUID();
        var editor = new WorkspaceMember(workspaceId, editorId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, ownerId);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, editorId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(editor));

        // Act & Assert
        assertThrows(AuthorizationError.class, () -> memberService.getMembers(editorId, workspaceId));
    }

    /* ─── inviteMember ───────────────────────────────────────── */

    @Test
    void shouldInviteMemberByEmailSuccessfully() {
        // Arrange
        var inviteeId = UUID.randomUUID();
        var invitee = createUser(inviteeId, "invitee@test.com");
        var request = new InviteMemberRequest("invitee@test.com", WorkspaceRole.VIEWER);
        var workspace = createWorkspace(workspaceId, ownerId);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase("invitee@test.com")).thenReturn(Optional.of(invitee));
        when(memberRepository.findByWorkspaceIdAndUserId(workspaceId, inviteeId)).thenReturn(Optional.empty());
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));

        // Act
        MemberResponse response = memberService.inviteMember(ownerId, workspaceId, request);

        // Assert
        assertNotNull(response);
        assertEquals("invitee@test.com", response.email());
        assertEquals(WorkspaceRole.VIEWER, response.role());
        assertEquals(WorkspaceMemberStatus.ACTIVE, response.status());
        verify(memberRepository).save(any(WorkspaceMember.class));
    }

    @Test
    void shouldThrowNotFoundErrorWhenInviteeEmailNotFound() {
        // Arrange
        var request = new InviteMemberRequest("unknown@test.com", WorkspaceRole.EDITOR);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase("unknown@test.com")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundError.class, () -> memberService.inviteMember(ownerId, workspaceId, request));
    }

    @Test
    void shouldThrowValidationErrorWhenInvitingSelf() {
        // Arrange
        var ownerUser = createUser(ownerId, "owner@test.com");
        var request = new InviteMemberRequest("owner@test.com", WorkspaceRole.EDITOR);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase("owner@test.com")).thenReturn(Optional.of(ownerUser));

        // Act & Assert
        assertThrows(ValidationError.class, () -> memberService.inviteMember(ownerId, workspaceId, request));
    }

    @Test
    void shouldThrowConflictErrorWhenMemberAlreadyActive() {
        // Arrange
        var existingId = UUID.randomUUID();
        var existingUser = createUser(existingId, "existing@test.com");
        var existingMember = new WorkspaceMember(workspaceId, existingId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, ownerId);
        var request = new InviteMemberRequest("existing@test.com", WorkspaceRole.EDITOR);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);
        when(userRepository.findByEmailIgnoreCase("existing@test.com")).thenReturn(Optional.of(existingUser));
        when(memberRepository.findByWorkspaceIdAndUserId(workspaceId, existingId)).thenReturn(Optional.of(existingMember));

        // Act & Assert
        assertThrows(ConflictError.class, () -> memberService.inviteMember(ownerId, workspaceId, request));
    }

    @Test
    void shouldThrowValidationErrorWhenInvitingAsOwnerRole() {
        // Arrange
        var request = new InviteMemberRequest("new@test.com", WorkspaceRole.OWNER);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(workspaceRepository.existsById(workspaceId)).thenReturn(true);

        // Act & Assert
        assertThrows(ValidationError.class, () -> memberService.inviteMember(ownerId, workspaceId, request));
    }

    /* ─── changeRole ─────────────────────────────────────────── */

    @Test
    void shouldChangeRoleSuccessfully() {
        // Arrange
        var targetId = UUID.randomUUID();
        var target = new WorkspaceMember(workspaceId, targetId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, ownerId);
        var targetUser = createUser(targetId, "target@test.com");
        var request = new UpdateMemberRoleRequest(WorkspaceRole.EDITOR);
        var workspace = createWorkspace(workspaceId, ownerId);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, targetId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(target));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));

        // Act
        MemberResponse response = memberService.changeRole(ownerId, workspaceId, targetId, request);

        // Assert
        assertEquals(WorkspaceRole.EDITOR, response.role());
        verify(memberRepository).save(target);
    }

    @Test
    void shouldThrowAuthorizationErrorWhenChangingOwnerRole() {
        // Arrange
        var request = new UpdateMemberRoleRequest(WorkspaceRole.VIEWER);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));

        assertThrows(AuthorizationError.class, () -> memberService.changeRole(ownerId, workspaceId, ownerId, request));
    }

    /* ─── removeMember ───────────────────────────────────────── */

    @Test
    void shouldRemoveMemberSuccessfully() {
        // Arrange
        var targetId = UUID.randomUUID();
        var target = new WorkspaceMember(workspaceId, targetId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, ownerId);
        var workspace = createWorkspace(workspaceId, ownerId);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, targetId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(target));
        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));

        // Act
        memberService.removeMember(ownerId, workspaceId, targetId);

        // Assert
        assertEquals(WorkspaceMemberStatus.REVOKED, target.getStatus());
        verify(memberRepository).save(target);
    }

    @Test
    void shouldThrowValidationErrorWhenRemovingSelf() {
        // Arrange
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));

        // Act & Assert
        assertThrows(ValidationError.class, () -> memberService.removeMember(ownerId, workspaceId, ownerId));
        verify(memberRepository, never()).save(any());
    }

    @Test
    void shouldThrowAuthorizationErrorWhenRemovingOwner() {
        // Arrange
        var otherOwnerId = UUID.randomUUID();
        var callerMember = new WorkspaceMember(workspaceId, ownerId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId);
        var otherOwner = new WorkspaceMember(workspaceId, otherOwnerId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId);

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(callerMember));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, otherOwnerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(otherOwner));

        // Act & Assert
        assertThrows(AuthorizationError.class, () -> memberService.removeMember(ownerId, workspaceId, otherOwnerId));
    }

    @Test
    void shouldThrowNotFoundErrorWhenRemovingNonexistentMember() {
        // Arrange
        var unknownId = UUID.randomUUID();

        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(memberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, unknownId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundError.class, () -> memberService.removeMember(ownerId, workspaceId, unknownId));
    }

    /* ─── Test helpers ───────────────────────────────────────── */

    private User createUser(UUID id, String email) {
        return new User(id, email, "hashedPassword", SystemRole.USER, UserStatus.ACTIVE, Instant.now());
    }

    private Workspace createWorkspace(UUID id, UUID owner) {
        return new Workspace(id, owner, "Test WS", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
    }
}
