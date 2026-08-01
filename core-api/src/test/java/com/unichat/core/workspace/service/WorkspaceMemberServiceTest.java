package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.user.domain.SystemRole;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.user.domain.UserStatus;
import com.unichat.core.workspace.api.AddWorkspaceMemberRequest;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class WorkspaceMemberServiceTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository workspaceMemberRepository;
    private UserRepository userRepository;
    private WorkspaceMemberService workspaceMemberService;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        userRepository = mock(UserRepository.class);
        workspaceMemberService = new WorkspaceMemberService(workspaceRepository, workspaceMemberRepository, userRepository);
    }

    @Test
    void shouldAddMemberSuccessfullyWhenOwner() {
        var ownerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var targetUserId = UUID.randomUUID();
        var email = "student@unichat.edu.vn";

        var workspace = new Workspace(workspaceId, ownerId, "Class Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var ownerMember = new WorkspaceMember(workspaceId, ownerId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId);
        var targetUser = new User(targetUserId, email, "hashed_pass", SystemRole.USER, UserStatus.ACTIVE, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(targetUser));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUserId)).thenReturn(Optional.empty());

        var request = new AddWorkspaceMemberRequest(email, WorkspaceRole.EDITOR);

        var response = workspaceMemberService.addMember(ownerId, workspaceId, request);

        assertNotNull(response);
        assertEquals(email, response.email());
        assertEquals(WorkspaceRole.EDITOR, response.role());
        verify(workspaceMemberRepository).save(any(WorkspaceMember.class));
    }

    @Test
    void shouldThrowAuthorizationErrorWhenNonOwnerAddsMember() {
        var editorId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Class Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var editorMember = new WorkspaceMember(workspaceId, editorId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, editorId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, editorId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(editorMember));

        var request = new AddWorkspaceMemberRequest("member@unichat.edu.vn", WorkspaceRole.VIEWER);

        assertThrows(AuthorizationError.class, () -> workspaceMemberService.addMember(editorId, workspaceId, request));
    }

    @Test
    void shouldThrowConflictErrorWhenUserIsAlreadyActiveMember() {
        var ownerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var existingUserId = UUID.randomUUID();
        var email = "existing@unichat.edu.vn";

        var workspace = new Workspace(workspaceId, ownerId, "Class Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var ownerMember = new WorkspaceMember(workspaceId, ownerId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId);
        var existingUser = new User(existingUserId, email, "hashed_pass", SystemRole.USER, UserStatus.ACTIVE, Instant.now());
        var activeMember = new WorkspaceMember(workspaceId, existingUserId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, ownerId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(userRepository.findByEmailIgnoreCase(email)).thenReturn(Optional.of(existingUser));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, existingUserId)).thenReturn(Optional.of(activeMember));

        var request = new AddWorkspaceMemberRequest(email, WorkspaceRole.EDITOR);

        assertThrows(ConflictError.class, () -> workspaceMemberService.addMember(ownerId, workspaceId, request));
    }

    @Test
    void shouldRemoveMemberSuccessfully() {
        var ownerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var targetUserId = UUID.randomUUID();

        var workspace = new Workspace(workspaceId, ownerId, "Class Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var ownerMember = new WorkspaceMember(workspaceId, ownerId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId);
        var targetMember = new WorkspaceMember(workspaceId, targetUserId, WorkspaceRole.VIEWER, WorkspaceMemberStatus.ACTIVE, ownerId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(ownerMember));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, targetUserId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(targetMember));

        workspaceMemberService.removeMember(ownerId, workspaceId, targetUserId);

        assertEquals(WorkspaceMemberStatus.REVOKED, targetMember.getStatus());
        verify(workspaceMemberRepository).save(targetMember);
    }
}
