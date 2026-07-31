package com.unichat.core.workspace.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.unichat.core.common.error.AuthorizationError;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.NotFoundError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.user.domain.User;
import com.unichat.core.user.domain.UserRepository;
import com.unichat.core.workspace.api.InviteMemberRequest;
import com.unichat.core.workspace.api.MemberResponse;
import com.unichat.core.workspace.api.UpdateMemberRoleRequest;
import com.unichat.core.workspace.domain.Workspace;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberRepository;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRepository;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Business logic for workspace membership operations.
 * All mutating operations require the caller to be the workspace OWNER.
 */
@Service
public class MemberService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository memberRepository;
    private final UserRepository userRepository;

    public MemberService(
            WorkspaceRepository workspaceRepository,
            WorkspaceMemberRepository memberRepository,
            UserRepository userRepository) {
        this.workspaceRepository = workspaceRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
    }

    /**
     * Lists active members of a workspace. Only OWNER may call this.
     *
     * @param callerId    authenticated user ID
     * @param workspaceId target workspace
     * @return list of active members with user profile info
     */
    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(UUID callerId, UUID workspaceId) {
        requireOwner(callerId, workspaceId);

        List<WorkspaceMember> members = memberRepository
                .findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE);

        return members.stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Invites a user to the workspace by email. Auto-activates membership.
     *
     * @param callerId    authenticated user ID (must be OWNER)
     * @param workspaceId target workspace
     * @param request     invite payload with email and role
     * @return newly created member response
     */
    @Transactional
    public MemberResponse inviteMember(UUID callerId, UUID workspaceId, InviteMemberRequest request) {
        requireOwner(callerId, workspaceId);
        requireWorkspaceExists(workspaceId);
        validateInviteRole(request.role());

        User invitedUser = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new NotFoundError("Không tìm thấy người dùng với email: " + request.email()));

        if (invitedUser.getId().equals(callerId)) {
            throw new ValidationError("Không thể mời chính mình vào workspace");
        }

        memberRepository.findByWorkspaceIdAndUserId(workspaceId, invitedUser.getId())
                .ifPresent(existing -> {
                    if (WorkspaceMemberStatus.ACTIVE.equals(existing.getStatus())) {
                        throw new ConflictError("Người dùng đã là thành viên của workspace");
                    }
                });

        WorkspaceMember member = new WorkspaceMember(
                workspaceId,
                invitedUser.getId(),
                request.role(),
                WorkspaceMemberStatus.ACTIVE,
                callerId);
        memberRepository.save(member);
        incrementPermissionVersion(workspaceId);

        return MemberResponse.from(member, invitedUser);
    }

    /**
     * Changes the role of an existing workspace member.
     *
     * @param callerId     authenticated user ID (must be OWNER)
     * @param workspaceId  target workspace
     * @param targetUserId member whose role is being changed
     * @param request      new role payload
     * @return updated member response
     */
    @Transactional
    public MemberResponse changeRole(UUID callerId, UUID workspaceId, UUID targetUserId,
            UpdateMemberRoleRequest request) {
        requireOwner(callerId, workspaceId);
        validateInviteRole(request.role());

        WorkspaceMember member = findActiveMember(workspaceId, targetUserId);

        if (WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Không thể thay đổi vai trò của chủ sở hữu");
        }

        member.setRole(request.role());
        memberRepository.save(member);
        incrementPermissionVersion(workspaceId);

        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));
        return MemberResponse.from(member, user);
    }

    /**
     * Removes a member from the workspace by revoking their status.
     *
     * @param callerId     authenticated user ID (must be OWNER)
     * @param workspaceId  target workspace
     * @param targetUserId member to remove
     */
    @Transactional
    public void removeMember(UUID callerId, UUID workspaceId, UUID targetUserId) {
        requireOwner(callerId, workspaceId);

        if (callerId.equals(targetUserId)) {
            throw new ValidationError("Không thể tự xóa chính mình khỏi workspace");
        }

        WorkspaceMember member = findActiveMember(workspaceId, targetUserId);

        if (WorkspaceRole.OWNER.equals(member.getRole())) {
            throw new AuthorizationError("Không thể xóa chủ sở hữu khỏi workspace");
        }

        member.setStatus(WorkspaceMemberStatus.REVOKED);
        memberRepository.save(member);
        incrementPermissionVersion(workspaceId);
    }

    /* ─── Private helpers ──────────────────────────────────── */

    private void requireOwner(UUID callerId, UUID workspaceId) {
        WorkspaceMember caller = memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, callerId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));

        if (!WorkspaceRole.OWNER.equals(caller.getRole())) {
            throw new AuthorizationError("Chỉ chủ sở hữu mới có quyền quản lý thành viên");
        }
    }

    private void requireWorkspaceExists(UUID workspaceId) {
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new NotFoundError("Workspace không tồn tại");
        }
    }

    private void validateInviteRole(WorkspaceRole role) {
        if (WorkspaceRole.OWNER.equals(role)) {
            throw new ValidationError("Không thể gán vai trò chủ sở hữu cho thành viên mời");
        }
    }

    private WorkspaceMember findActiveMember(UUID workspaceId, UUID userId) {
        return memberRepository
                .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceMemberStatus.ACTIVE)
                .orElseThrow(() -> new NotFoundError("Thành viên không tồn tại hoặc đã bị thu hồi"));
    }

    private void incrementPermissionVersion(UUID workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new NotFoundError("Workspace không tồn tại"));
        workspace.incrementPermissionVersion();
        workspaceRepository.save(workspace);
    }

    private MemberResponse toResponse(WorkspaceMember member) {
        User user = userRepository.findById(member.getUserId())
                .orElseThrow(() -> new NotFoundError("Người dùng không tồn tại"));
        return MemberResponse.from(member, user);
    }
}
