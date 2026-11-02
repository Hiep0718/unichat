package com.unichat.core.workspace.service;

import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.ValidationError;
import com.unichat.core.workspace.domain.WorkspaceVisibility;

/**
 * What each visibility level means for membership.
 *
 * <p>The three levels used to differ only by the label shown on a card:
 * every check in the codebase asked whether a workspace was PUBLIC, so PRIVATE
 * and SHARED behaved identically while four screens promised a user that
 * PRIVATE meant "only you". This holds the one rule that makes the ladder real:
 *
 * <ul>
 *   <li>PRIVATE — nobody but the owner. Adding a member is refused.</li>
 *   <li>SHARED — a closed group the owner invites people into by email.
 *       Invisible on the discovery page and not joinable from outside.</li>
 *   <li>PUBLIC — listed on the discovery page, joinable as a VIEWER.</li>
 * </ul>
 *
 * <p>Kept apart from the services that enforce it because three call sites now
 * apply it — adding a member, an owner changing the level, and an administrator
 * changing it — and a rule written three times is a rule that can disagree with
 * itself. See ADR-024.
 */
public final class WorkspaceVisibilityPolicy {

    private WorkspaceVisibilityPolicy() {}

    /**
     * Confirms the workspace is one that may hold members at all.
     *
     * <p>Guards the promise the create dialog makes: a workspace marked PRIVATE
     * is read by its owner and nobody else. Someone who wants to invite a
     * colleague switches the level first, which is a deliberate act rather than
     * a side effect of filling in an email field.
     *
     * @param visibility the workspace's current level
     * @throws ValidationError when the workspace is PRIVATE
     */
    public static void requireCanAddMember(WorkspaceVisibility visibility) {
        if (WorkspaceVisibility.PRIVATE.equals(visibility)) {
            throw new ValidationError(
                    "Workspace riêng tư chỉ dành cho một mình bạn. "
                            + "Hãy đổi sang chế độ Chia sẻ trước khi mời thành viên.");
        }
    }

    /**
     * Confirms a new level may be applied to a workspace as it stands.
     *
     * <p>Only the downgrade to PRIVATE is restricted, and only while other
     * people are still in. Without this, the guard on adding a member is a door
     * with no wall beside it: invite five people, drop back to PRIVATE, and the
     * workspace reads "Chỉ mình tôi" while five people keep their access.
     *
     * <p>Refuses rather than revoking everyone, because mass-revoking access
     * behind a single click is not something the owner can take back.
     *
     * @param next              the level being applied
     * @param activeMemberCount members with ACTIVE status, the owner included
     * @throws ConflictError when dropping to PRIVATE with others still present
     */
    public static void requireCanChangeTo(WorkspaceVisibility next, long activeMemberCount) {
        if (!WorkspaceVisibility.PRIVATE.equals(next) || activeMemberCount <= 1) {
            return;
        }
        throw new ConflictError(
                "Workspace còn " + (activeMemberCount - 1) + " thành viên khác nên chưa thể "
                        + "chuyển sang riêng tư. Hãy xóa họ khỏi workspace trước.");
    }

    /**
     * Reads a visibility level sent as text.
     *
     * <p>Lives here so an unknown value is answered with a 400 naming the
     * accepted levels, instead of the 500 that an unguarded
     * {@code valueOf} produces on any typo.
     *
     * @param raw the value as the client sent it, case-insensitive
     * @return the matching level
     * @throws ValidationError when it is missing, blank or not a known level
     */
    public static WorkspaceVisibility parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ValidationError("Thiếu chế độ hiển thị (PRIVATE, SHARED hoặc PUBLIC)");
        }
        try {
            return WorkspaceVisibility.valueOf(raw.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new ValidationError(
                    "Chế độ hiển thị không hợp lệ. Chỉ nhận PRIVATE, SHARED hoặc PUBLIC.");
        }
    }
}
