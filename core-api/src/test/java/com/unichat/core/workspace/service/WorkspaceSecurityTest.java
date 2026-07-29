package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.api.UpdateWorkspaceMemberRequest;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class WorkspaceSecurityTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository workspaceMemberRepository;
    private UserRepository userRepository;
    private WorkspaceMemberService workspaceMemberService;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        userRepository = mock(UserRepository.class);
        workspaceMemberService = new WorkspaceMemberService(
                workspaceRepository,
                workspaceMemberRepository,
                userRepository
        );
    }

    @Test
    void shouldBlockIdorAccessWhenUserNotInWorkspace() {
        var attackerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Victim Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, attackerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThrows(NotFoundError.class, () ->
                workspaceMemberService.getMembers(attackerId, workspaceId));
    }

    @Test
    void shouldPreventEditorFromChangingMemberRoles() {
        var editorId = UUID.randomUUID();
        var targetMemberId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();

        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Class Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now());
        var editorMember = new WorkspaceMember(workspaceId, editorId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, editorId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, editorId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(editorMember));

        var request = new UpdateWorkspaceMemberRequest(WorkspaceRole.OWNER);

        assertThrows(AuthorizationError.class, () ->
                workspaceMemberService.updateMemberRole(editorId, workspaceId, targetMemberId, request));
    }
}
