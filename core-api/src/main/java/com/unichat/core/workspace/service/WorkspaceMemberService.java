package com.unichat.core.workspace.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.api.AddWorkspaceMemberRequest;
import com.unichat.core.workspace.api.UpdateWorkspaceMemberRequest;
import com.unichat.core.workspace.api.WorkspaceMemberResponse;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Service orchestrating workspace membership management and role updates.
 */
@Service
public class WorkspaceMemberService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;

    public WorkspaceMemberService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository workspaceMemberRepository,
            UserRepository userRepository) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.userRepository = userRepository;
    }

    /**
     * Lists active members of a workspace.
     */
    @Transactional(readOnly = true)
    public List<WorkspaceMemberResponse> getMembers(UUID currentUserId, UUID workspaceId) {
        Workspace workspace = validateOwnerAccess(currentUserId, workspaceId);

        List<WorkspaceMember> members = workspaceMemberRepository
                .findByWorkspaceIdAndStatus(workspace.getId(), WorkspaceMemberStatus.ACTIVE);

        List<UUID> userIds = members.stream().map(WorkspaceMember::getUserId).toList();
        Map<UUID, String> emailMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getEmail));

        return members.stream()
                .map(m -> WorkspaceMemberResponse.from(m, emailMap.getOrDefault(m.getUserId(), "")))
                .toList();
    }

    /**
     * Adds a new member to a workspace by email.
     */
    @Transactional
    public WorkspaceMemberResponse addMember(UUID currentUserId, UUID workspaceId, AddWorkspaceMemberRequest request) {
        Workspace workspace = validateOwnerAccess(currentUserId, workspaceId);

        User targetUser = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new NotFoundError("Không tìm thấy người dùng với email này"));

        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, targetUser.getId())
                .ifPresent(existing -> {
                    if (WorkspaceMemberStatus.ACTIVE.equals(existing.getStatus())) {
                        throw new ConflictError("Người dùng đã là thành viên của workspace");
                    }
                });

        WorkspaceMember member = new WorkspaceMember(
                workspaceId,
                targetUser.getId(),
                request.role(),
                WorkspaceMemberStatus.ACTIVE,
                currentUserId
        );

        workspaceMemberRepository.save(member);
        workspace.incrementPermissionVersion();
        workspaceRepository.save(workspace);

        return WorkspaceMemberResponse.from(member, targetUser.getEmail());
    }

    /**
     * Updates a member's role in a workspace.
     */
    @Transactional
    public WorkspaceMemberResponse updateMemberRole(
            UUID currentUserId, UUID workspaceId, UUID targetUserId, UpdateWorkspaceMemberRequest request) {
        Workspace workspace = validateOwnerAccess(currentUserId, workspaceId);

        if (workspace.getOwnerId().equals(targetUserId) && !WorkspaceRole.OWNER.equals(request.role())) {
            throw new AuthorizationError("Không thể thay đổi vai trò của Chủ sở hữu chính");
        }

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, targetUserId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Thành viên không tồn tại trong workspace"));

        member.setRole(request.role());
        workspaceMemberRepository.save(member);

        workspace.incrementPermissionVersion();
        workspaceRepository.save(workspace);

        User targetUser = userRepository.findById(targetUserId).orElse(null);
        String email = targetUser != null ? targetUser.getEmail() : "";
        return WorkspaceMemberResponse.from(member, email);
    }

    /**
     * Removes a member from a workspace.
     */
    @Transactional
    public void removeMember(UUID currentUserId, UUID workspaceId, UUID targetUserId) {
        Workspace workspace = validateOwnerAccess(currentUserId, workspaceId);

        if (workspace.getOwnerId().equals(targetUserId)) {
            throw new AuthorizationError("Không thể xóa Chủ sở hữu khỏi workspace");
        }

        WorkspaceMember member = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, targetUserId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Thành viên không tồn tại trong workspace"));

        member.setStatus(WorkspaceMemberStatus.REVOKED);
        workspaceMemberRepository.save(member);

        workspace.incrementPermissionVersion();
        workspaceRepository.save(workspace);
    }

    private Workspace validateOwnerAccess(UUID currentUserId, UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        WorkspaceMember currentMember = workspaceMemberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, currentUserId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (!WorkspaceRole.OWNER.equals(currentMember.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền quản lý thành viên");
        }

        return workspace;
    }
}
