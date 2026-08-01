package com.unichat.core.workspace.api;

import java.util.UUID;

import com.unichat.core.user.domain.User;
import com.unichat.core.workspace.domain.WorkspaceMember;
import com.unichat.core.workspace.domain.WorkspaceMemberStatus;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * Output representation of a workspace member including user profile info.
 */
public record MemberResponse(
    UUID userId,
    String email,
    WorkspaceRole role,
    WorkspaceMemberStatus status,
    UUID invitedById
) {
    /**
     * Maps a WorkspaceMember entity and its associated User to a response DTO.
     *
     * @param member workspace membership entity
     * @param user   associated user entity
     */
    public static MemberResponse from(WorkspaceMember member, User user) {
        return new MemberResponse(
            member.getUserId(),
            user.getEmail(),
            member.getRole(),
            member.getStatus(),
            member.getInvitedById()
        );
    }
}
