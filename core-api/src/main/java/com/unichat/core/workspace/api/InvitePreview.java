package com.unichat.core.workspace.api;

import java.util.UUID;

import com.unichat.core.workspace.domain.WorkspaceRole;

/**
 * What someone holding an invite link is shown before they sign in.
 *
 * <p>Served without authentication, so everything here is public to whoever
 * holds the link — including the link-preview bots that chat clients run
 * automatically. It therefore carries only what is needed to decide whether to
 * accept: enough to recognise the group and who invited you.
 *
 * <p>Deliberately absent: the document library, the member list, the member
 * count, and the workspace description. None of them are needed to make that
 * decision, and each would publish something about a closed group to anyone
 * the link reached.
 *
 * @param workspaceName the group being joined
 * @param invitedByName who created the link, so the recipient can tell whether
 *                      they expected it
 * @param role          what accepting will grant
 */
public record InvitePreview(
        UUID workspaceId,
        String workspaceName,
        String invitedByName,
        WorkspaceRole role
) {}
