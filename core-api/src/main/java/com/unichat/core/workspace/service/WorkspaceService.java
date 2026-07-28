package com.unichat.core.workspace.service;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.workspace.api.CreateWorkspaceRequest;
import com.unichat.core.workspace.api.UpdateWorkspaceRequest;
import com.unichat.core.workspace.api.WorkspaceResponse;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;
import com.unichat.core.shared.util.UuidGenerator;

/**
 * Orchestrates business logic for workspace lifecycle and membership ACL.
 */
@Service
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final Clock clock;

    public WorkspaceService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            Clock clock) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.clock = clock;
    }

    /**
     * Finds workspaces visible to a user.
     */
    @Transactional(readOnly = true)
    public Page<WorkspaceResponse> getWorkspaces(UUID userId, Pageable pageable) {
        return workspaceRepository.findAllVisibleToUser(userId, pageable)
                .map(this::toResponse);
    }

    /**
     * Creates a new workspace and sets the owner membership.
     */
    @Transactional
    public WorkspaceResponse createWorkspace(UUID ownerId, CreateWorkspaceRequest request) {
        Instant now = Instant.now(clock);
        UUID workspaceId = UuidGenerator.generateV7();

        boolean cloud = request.cloudAllowed() != null ? request.cloudAllowed() : false;
        Workspace workspace = new Workspace(
                workspaceId,
                ownerId,
                request.name(),
                request.description(),
                request.visibility(),
                cloud,
                now
        );

        WorkspaceMember ownerMember = new WorkspaceMember(
                workspaceId,
                ownerId,
                WorkspaceRole.OWNER,
                WorkspaceMemberStatus.ACTIVE,
                ownerId
        );

        workspaceRepository.save(workspace);
        workspaceMemberRepository.save(ownerMember);

        return WorkspaceResponse.from(workspace, 0, 1);
    }

    /**
     * Gets workspace by ID, validating ACL.
     */
    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (!WorkspaceVisibility.PUBLIC.equals(workspace.getVisibility())) {
            checkAccess(userId, workspaceId);
        }

        return toResponse(workspace);
    }

    /**
     * Updates an existing workspace.
     */
    @Transactional
    public WorkspaceResponse updateWorkspace(UUID userId, UUID workspaceId, UpdateWorkspaceRequest request) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        // Validate membership / authorization
        WorkspaceMember member = checkAccess(userId, workspaceId);
        if (WorkspaceRole.VIEWER.equals(member.getRole())) {
            throw new AuthorizationError("Không có quyền chỉnh sửa workspace này");
        }

        // Optimistic locking
        if (workspace.getVersion() != request.expectedVersion()) {
            throw new ConflictError("Phiên bản dữ liệu không khớp (optimistic lock conflict)");
        }

        if (request.name() != null) {
            workspace.setName(request.name());
        }
        if (request.description() != null) {
            workspace.setDescription(request.description());
        }
        if (request.visibility() != null) {
            if (!WorkspaceRole.OWNER.equals(member.getRole())) {
                throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền đổi chế độ hiển thị");
            }
            workspace.setVisibility(request.visibility());
            workspace.incrementPermissionVersion();
        }
        if (request.cloudAllowed() != null) {
            if (!WorkspaceRole.OWNER.equals(member.getRole())) {
                throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền đổi cấu hình cloud");
            }
            workspace.setCloudAllowed(request.cloudAllowed());
        }
        workspace.setUpdatedAt(Instant.now(clock));

        workspaceRepository.save(workspace);
        return toResponse(workspace);
    }

    /**
     * Deletes a workspace.
     */
    @Transactional
    public void deleteWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        // Only OWNER can delete
        WorkspaceMember member = checkAccess(userId, workspaceId);
        if (!WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền xóa workspace");
        }

        workspace.setStatus(com.unichat.core.workspace.domain.WorkspaceStatus.DELETING);
        workspace.setUpdatedAt(Instant.now(clock));
        workspaceRepository.save(workspace);
        // TODO: Full delete saga when document/chat features are implemented
    }

    private WorkspaceMember checkAccess(UUID userId, UUID workspaceId) {
        return workspaceMemberRepository.findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }

    /**
     * Converts a Workspace entity to response with aggregated counts.
     * Document count is 0 until the document feature is implemented.
     */
    private WorkspaceResponse toResponse(Workspace workspace) {
        long memberCount = workspaceMemberRepository
                .countByWorkspaceIdAndStatus(workspace.getId(), WorkspaceMemberStatus.ACTIVE);
        return WorkspaceResponse.from(workspace, 0, memberCount);
    }
}
