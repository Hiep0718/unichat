package com.unichat.core.workspace.api;

import java.util.UUID;

import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Response payload representing workspace member details.
 */
public record WorkspaceMemberResponse(
        UUID workspaceId,
        UUID userId,
        String email,
        WorkspaceRole role,
        WorkspaceMemberStatus status,
        UUID invitedById
) {
    public static WorkspaceMemberResponse from(WorkspaceMember member, String email) {
        return new WorkspaceMemberResponse(
                member.getWorkspaceId(),
                member.getUserId(),
                email,
                member.getRole(),
                member.getStatus(),
                member.getInvitedById()
        );
    }
}
