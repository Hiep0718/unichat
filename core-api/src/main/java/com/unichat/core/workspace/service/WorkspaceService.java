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
import com.unichat.core.workspace.domain.ContributionPolicy;
import com.unichat.core.workspace.domain.JoinPolicy;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;
import com.unichat.core.workspace.domain.WorkspaceVisibility;
import com.unichat.core.shared.util.UuidGenerator;

/**
 * Orchestrates business logic for workspace lifecycle, membership ACL,
 * and community join/leave flows.
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

    /** Finds workspaces visible to a user. */
    @Transactional(readOnly = true)
    public Page<WorkspaceResponse> getWorkspaces(UUID userId, Pageable pageable) {
        return workspaceRepository.findAllVisibleToUser(userId, pageable)
                .map(workspace -> toResponseWithRole(workspace, userId));
    }

    /** Creates a new workspace and sets the owner membership. */
    @Transactional
    public WorkspaceResponse createWorkspace(UUID ownerId, CreateWorkspaceRequest request) {
        Instant now = Instant.now(clock);
        UUID workspaceId = UuidGenerator.generateV7();

        boolean cloud = request.cloudAllowed() != null ? request.cloudAllowed() : false;
        Workspace workspace = new Workspace(
                workspaceId, ownerId, request.name(),
                request.description(), request.visibility(), cloud, now
        );

        applyOptionalCommunityFields(workspace, request);

        WorkspaceMember ownerMember = new WorkspaceMember(
                workspaceId, ownerId, WorkspaceRole.OWNER,
                WorkspaceMemberStatus.ACTIVE, ownerId
        );

        workspaceRepository.save(workspace);
        workspaceMemberRepository.save(ownerMember);

        return WorkspaceResponse.from(workspace, 0, 1, WorkspaceRole.OWNER);
    }

    /** Gets workspace by ID, validating ACL. */
    @Transactional(readOnly = true)
    public WorkspaceResponse getWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = findWorkspaceOrThrow(workspaceId);

        WorkspaceRole userRole;
        if (!WorkspaceVisibility.PUBLIC.equals(workspace.getVisibility())) {
            WorkspaceMember member = checkAccess(userId, workspaceId);
            userRole = member.getRole();
        } else {
            userRole = workspaceMemberRepository
                    .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                    .map(WorkspaceMember::getRole)
                    .orElse(null);
        }

        return toResponse(workspace, userRole);
    }

    /** Updates an existing workspace. */
    @Transactional
    public WorkspaceResponse updateWorkspace(UUID userId, UUID workspaceId, UpdateWorkspaceRequest request) {
        Workspace workspace = findWorkspaceOrThrow(workspaceId);
        WorkspaceMember member = checkAccess(userId, workspaceId);

        if (WorkspaceRole.VIEWER.equals(member.getRole())) {
            throw new AuthorizationError("Không có quyền chỉnh sửa workspace này");
        }
        if (workspace.getVersion() != request.expectedVersion()) {
            throw new ConflictError("Phiên bản dữ liệu không khớp (optimistic lock conflict)");
        }

        applyUpdateFields(workspace, request, member.getRole());
        workspace.setUpdatedAt(Instant.now(clock));
        workspaceRepository.save(workspace);

        return toResponse(workspace, member.getRole());
    }

    /** Deletes a workspace. */
    @Transactional
    public void deleteWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = findWorkspaceOrThrow(workspaceId);
        WorkspaceMember member = checkAccess(userId, workspaceId);

        if (!WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền xóa workspace");
        }

        workspace.setStatus(com.unichat.core.workspace.domain.WorkspaceStatus.DELETING);
        workspace.setUpdatedAt(Instant.now(clock));
        workspaceRepository.save(workspace);
    }

    /** Finds public workspaces the user has not yet joined. */
    @Transactional(readOnly = true)
    public Page<WorkspaceResponse> getPublicWorkspaces(UUID userId, String search, Pageable pageable) {
        String searchTerm = (search == null || search.isBlank()) ? "%" : "%" + search.trim() + "%";
        return workspaceRepository.findPublicWorkspacesExcludingMember(userId, searchTerm, pageable)
                .map(workspace -> toResponse(workspace, null));
    }

    /** Allows a user to self-join a PUBLIC workspace. */
    @Transactional
    public WorkspaceResponse joinPublicWorkspace(UUID userId, UUID workspaceId) {
        Workspace workspace = findWorkspaceOrThrow(workspaceId);

        if (!WorkspaceVisibility.PUBLIC.equals(workspace.getVisibility())) {
            throw new AuthorizationError("Chỉ có thể tham gia workspace công khai");
        }

        boolean alreadyMember = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .isPresent();
        if (alreadyMember) {
            throw new ConflictError("Bạn đã là thành viên của workspace này");
        }

        boolean pendingRequest = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.PENDING_APPROVAL)
                .isPresent();
        if (pendingRequest) {
            throw new ConflictError("Yêu cầu tham gia đang chờ duyệt");
        }

        WorkspaceMemberStatus status = resolveJoinStatus(workspace.getJoinPolicy());
        WorkspaceRole role = (status == WorkspaceMemberStatus.ACTIVE)
                ? WorkspaceRole.VIEWER : WorkspaceRole.VIEWER;

        WorkspaceMember member = new WorkspaceMember(
                workspaceId, userId, role, status, userId
        );
        workspaceMemberRepository.save(member);
        workspace.incrementPermissionVersion();
        workspaceRepository.save(workspace);

        return toResponse(workspace, role);
    }

    /**
     * Allows a non-OWNER member to leave a workspace.
     *
     * @param userId      user leaving
     * @param workspaceId target workspace
     */
    @Transactional
    public void leaveWorkspace(UUID userId, UUID workspaceId) {
        findWorkspaceOrThrow(workspaceId);

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Bạn không phải thành viên của workspace này"));

        if (WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Chủ sở hữu không thể rời workspace");
        }

        member.setStatus(WorkspaceMemberStatus.REVOKED);
        workspaceMemberRepository.save(member);
    }

    // --- Private helpers ---

    private Workspace findWorkspaceOrThrow(UUID workspaceId) {
        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }

    private WorkspaceMember checkAccess(UUID userId, UUID workspaceId) {
        return workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
    }

    private WorkspaceMemberStatus resolveJoinStatus(JoinPolicy policy) {
        if (policy == null || policy == JoinPolicy.OPEN) {
            return WorkspaceMemberStatus.ACTIVE;
        }
        return WorkspaceMemberStatus.PENDING_APPROVAL;
    }

    private void applyOptionalCommunityFields(Workspace workspace, CreateWorkspaceRequest request) {
        if (request.category() != null) {
            workspace.setCategory(request.category());
        }
        if (request.joinPolicy() != null) {
            workspace.setJoinPolicy(request.joinPolicy());
        }
        if (request.contributionPolicy() != null) {
            workspace.setContributionPolicy(request.contributionPolicy());
        }
    }

    private void applyUpdateFields(Workspace workspace, UpdateWorkspaceRequest request, WorkspaceRole role) {
        if (request.name() != null) {
            workspace.setName(request.name());
        }
        if (request.description() != null) {
            workspace.setDescription(request.description());
        }
        if (request.visibility() != null) {
            requireOwner(role, "Chỉ chủ sở hữu mới có quyền đổi chế độ hiển thị");
            workspace.setVisibility(request.visibility());
            workspace.incrementPermissionVersion();
        }
        if (request.cloudAllowed() != null) {
            requireOwner(role, "Chỉ chủ sở hữu mới có quyền đổi cấu hình cloud");
            workspace.setCloudAllowed(request.cloudAllowed());
        }
    }

    private void requireOwner(WorkspaceRole role, String message) {
        if (!WorkspaceRole.OWNER.equals(role)) {
            throw new AuthorizationError(message);
        }
    }

    private WorkspaceResponse toResponse(Workspace workspace, WorkspaceRole userRole) {
        long memberCount = workspaceMemberRepository
                .countByWorkspaceIdAndStatus(workspace.getId(), WorkspaceMemberStatus.ACTIVE);
        return WorkspaceResponse.from(workspace, 0, memberCount, userRole);
    }

    private WorkspaceResponse toResponseWithRole(Workspace workspace, UUID userId) {
        WorkspaceRole userRole = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspace.getId(), userId, WorkspaceMemberStatus.ACTIVE)
                .map(WorkspaceMember::getRole)
                .orElse(null);
        return toResponse(workspace, userRole);
    }
}
