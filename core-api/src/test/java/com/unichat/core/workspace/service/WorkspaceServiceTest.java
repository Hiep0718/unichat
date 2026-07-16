package com.unichat.core.workspace.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workspace.api.CreateWorkspaceRequest;
import com.unichat.core.workspace.api.UpdateWorkspaceRequest;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class WorkspaceServiceTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository workspaceMemberRepository;
    private Clock clock;
    private WorkspaceService workspaceService;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);
        workspaceService = new WorkspaceService(workspaceRepository, workspaceMemberRepository, clock);
    }

    @Test
    void shouldCreateWorkspaceAndAddOwnerMember() {
        // Arrange
        var ownerId = UUID.randomUUID();
        var request = new CreateWorkspaceRequest("My Class", "Topic description", WorkspaceVisibility.PRIVATE, false);

        // Act
        var response = workspaceService.createWorkspace(ownerId, request);

        // Assert
        assertNotNull(response);
        assertEquals("My Class", response.name());
        assertEquals("Topic description", response.description());
        assertEquals(WorkspaceVisibility.PRIVATE, response.visibility());
        verify(workspaceRepository).save(any(Workspace.class));
        verify(workspaceMemberRepository).save(any(WorkspaceMember.class));
    }

    @Test
    void shouldGetWorkspaceWhenUserIsMember() {
        // Arrange
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now(clock));
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, UUID.randomUUID());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        // Act
        var response = workspaceService.getWorkspace(userId, workspaceId);

        // Assert
        assertNotNull(response);
        assertEquals("Test Workspace", response.name());
    }

    @Test
    void shouldThrowNotFoundErrorWhenUserIsNotMemberOfPrivateWorkspace() {
        // Arrange
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now(clock));

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(NotFoundError.class, () -> workspaceService.getWorkspace(userId, workspaceId));
    }

    @Test
    void shouldThrowConflictErrorOnOptimisticLockFailure() {
        // Arrange
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, userId, "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now(clock));
        workspace.setVersion(1L);
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, userId);

        var request = new UpdateWorkspaceRequest("New Name", "New Description", null, null, 0L);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        // Act & Assert
        assertThrows(ConflictError.class, () -> workspaceService.updateWorkspace(userId, workspaceId, request));
    }

    @Test
    void shouldThrowAuthorizationErrorWhenNonOwnerDeletes() {
        // Arrange
        var userId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = new Workspace(workspaceId, UUID.randomUUID(), "Test Workspace", "", WorkspaceVisibility.PRIVATE, false, Instant.now(clock));
        var member = new WorkspaceMember(workspaceId, userId, WorkspaceRole.EDITOR, WorkspaceMemberStatus.ACTIVE, UUID.randomUUID());

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        // Act & Assert
        assertThrows(AuthorizationError.class, () -> workspaceService.deleteWorkspace(userId, workspaceId));
    }
}
