package com.unichat.core.workspace.api;

import java.time.Instant;
import java.util.UUID;

import com.unichat.core.workspace.domain.WorkspaceInvite;
import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * An invite link as its owner sees it.
 *
 * @param token only present on the response that created it. The raw value is
 *              never stored, so it cannot be shown again; listing existing
 *              links leaves this null rather than pretending otherwise.
 */
public record InviteResponse(
        UUID id,
        String token,
        WorkspaceRole role,
        Instant createdAt,
        Instant expiresAt,
        int maxUses,
        int usedCount,
        boolean active
) {
    /** The moment of creation, the one time the token can be handed over. */
    public static InviteResponse created(WorkspaceInvite invite, String token, Instant now) {
        return new InviteResponse(invite.getId(), token, invite.getRole(), invite.getCreatedAt(),
                invite.getExpiresAt(), invite.getMaxUses(), invite.getUsedCount(),
                invite.isUsable(now));
    }

    /** A link already created, whose token is gone for good. */
    public static InviteResponse existing(WorkspaceInvite invite, Instant now) {
        return new InviteResponse(invite.getId(), null, invite.getRole(), invite.getCreatedAt(),
                invite.getExpiresAt(), invite.getMaxUses(), invite.getUsedCount(),
                invite.isUsable(now));
    }
}
