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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workspace.api.CreateWorkspaceRequest;
import com.unichat.core.workspace.api.UpdateWorkspaceRequest;
import com.unichat.core.workspace.api.WorkspaceCardStats;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceTopicRepository;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

class WorkspaceServiceTest {

    private WorkspaceRepository workspaceRepository;
    private WorkspaceMemberRepository workspaceMemberRepository;
    private WorkspaceStatsLoader statsLoader;
    private WorkspaceTopicRepository topicRepository;
    private Clock clock;
    private WorkspaceService workspaceService;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(WorkspaceRepository.class);
        workspaceMemberRepository = mock(WorkspaceMemberRepository.class);
        statsLoader = mock(WorkspaceStatsLoader.class);
        when(statsLoader.loadOne(any())).thenReturn(WorkspaceCardStats.empty());
        clock = Clock.fixed(Instant.parse("2026-07-16T00:00:00Z"), ZoneOffset.UTC);
        topicRepository = mock(WorkspaceTopicRepository.class);
        workspaceService = new WorkspaceService(workspaceRepository, workspaceMemberRepository,
                statsLoader, topicRepository, clock);
    }

    @Test
    void shouldCreateWorkspaceAndAddOwnerMember() {
        // Arrange
        var ownerId = UUID.randomUUID();
        var request = new CreateWorkspaceRequest("My Class", "Topic description", WorkspaceVisibility.PRIVATE,
                false, List.of());

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

        var request = new UpdateWorkspaceRequest("New Name", "New Description", null, null, null, 0L);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(member));

        // Act & Assert
        assertThrows(ConflictError.class, () -> workspaceService.updateWorkspace(userId, workspaceId, request));
    }

    @Test
    void shouldRefuseDroppingToPrivateWhileOtherMembersRemain() {
        var ownerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = givenOwnedWorkspace(workspaceId, ownerId, WorkspaceVisibility.SHARED);
        givenActiveMembers(workspaceId, 3);

        var request = new UpdateWorkspaceRequest(
                null, null, WorkspaceVisibility.PRIVATE, null, null, workspace.getVersion());

        assertThrows(ConflictError.class,
                () -> workspaceService.updateWorkspace(ownerId, workspaceId, request));
        assertEquals(WorkspaceVisibility.SHARED, workspace.getVisibility());
    }

    @Test
    void shouldAllowDroppingToPrivateOnceTheOwnerIsAlone() {
        var ownerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = givenOwnedWorkspace(workspaceId, ownerId, WorkspaceVisibility.SHARED);
        givenActiveMembers(workspaceId, 1);

        var request = new UpdateWorkspaceRequest(
                null, null, WorkspaceVisibility.PRIVATE, null, null, workspace.getVersion());

        var response = workspaceService.updateWorkspace(ownerId, workspaceId, request);

        assertEquals(WorkspaceVisibility.PRIVATE, response.visibility());
    }

    @Test
    void shouldApplyTheSameRuleWhenAnAdministratorChangesVisibility() {
        var ownerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = givenOwnedWorkspace(workspaceId, ownerId, WorkspaceVisibility.PUBLIC);
        givenActiveMembers(workspaceId, 4);

        assertThrows(ConflictError.class,
                () -> workspaceService.setVisibilityAsAdmin(workspaceId, WorkspaceVisibility.PRIVATE));
        assertEquals(WorkspaceVisibility.PUBLIC, workspace.getVisibility());
    }

    @Test
    void shouldLetAnAdministratorPublishAWorkspaceTheyAreNotAMemberOf() {
        var ownerId = UUID.randomUUID();
        var workspaceId = UUID.randomUUID();
        var workspace = givenOwnedWorkspace(workspaceId, ownerId, WorkspaceVisibility.SHARED);
        givenActiveMembers(workspaceId, 4);

        var response = workspaceService.setVisibilityAsAdmin(workspaceId, WorkspaceVisibility.PUBLIC);

        assertEquals(WorkspaceVisibility.PUBLIC, response.visibility());
        assertEquals(1L, workspace.getPermissionVersion());
        verify(workspaceRepository).save(workspace);
    }

    /** A workspace whose owner is an ACTIVE member, as every workspace has. */
    private Workspace givenOwnedWorkspace(UUID workspaceId, UUID ownerId, WorkspaceVisibility visibility) {
        var workspace = new Workspace(
                workspaceId, ownerId, "Test Workspace", "", visibility, false, Instant.now(clock));
        var owner = new WorkspaceMember(
                workspaceId, ownerId, WorkspaceRole.OWNER, WorkspaceMemberStatus.ACTIVE, ownerId);

        when(workspaceRepository.findById(workspaceId)).thenReturn(Optional.of(workspace));
        when(workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, ownerId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(Optional.of(owner));
        return workspace;
    }

    private void givenActiveMembers(UUID workspaceId, long count) {
        when(workspaceMemberRepository
                .countByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE))
                .thenReturn(count);
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
