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
        /** Name to show and to derive a letter avatar from; null when unresolved. */
        String displayName,
        /** Whether to fetch the member's picture or draw the letter avatar. */
        boolean hasAvatar,
        /** Chosen letter-avatar colour, null to derive one from the name. */
        String avatarColor,
        WorkspaceRole role,
        WorkspaceMemberStatus status,
        UUID invitedById
) {

    /**
     * Maps a membership together with the identity shown beside it.
     *
     * <p>The caller passes the already-loaded user fields rather than the user
     * itself, so this response stays clear of another feature's entity.
     *
     * @param email       the member's address, empty string when unresolved
     * @param displayName name to show, null when unresolved
     * @param hasAvatar   whether a picture was uploaded
     * @param avatarColor chosen colour key, null to derive from the name
     */
    public static WorkspaceMemberResponse from(WorkspaceMember member, String email,
                                               String displayName, boolean hasAvatar,
                                               String avatarColor) {
        return new WorkspaceMemberResponse(
                member.getWorkspaceId(),
                member.getUserId(),
                email,
                displayName,
                hasAvatar,
                avatarColor,
                member.getRole(),
                member.getStatus(),
                member.getInvitedById()
        );
    }
}
