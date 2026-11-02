package com.unichat.core.workspace.api;

import com.unichat.core.workspace.domain.WorkspaceRole;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * How a new invite link should behave.
 *
 * @param role         what joining confers; VIEWER or EDITOR, never OWNER
 * @param expiresInDays how long the link lives, capped so a forgotten link
 *                      stops working on its own
 * @param maxUses      how many people may join through it; 1 for a personal
 *                     invitation, higher for a class
 */
public record CreateInviteRequest(
        @NotNull(message = "Chưa chọn vai trò cho người được mời")
        WorkspaceRole role,

        @NotNull(message = "Chưa chọn thời hạn cho link mời")
        @Min(value = 1, message = "Link mời phải có hạn ít nhất 1 ngày")
        @Max(value = 30, message = "Link mời tối đa 30 ngày")
        Integer expiresInDays,

        @NotNull(message = "Chưa chọn số lượt dùng")
        @Min(value = 1, message = "Link mời phải dùng được ít nhất 1 lượt")
        @Max(value = 200, message = "Link mời tối đa 200 lượt")
        Integer maxUses
) {}
