package com.unichat.core.workchat.api;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/**
 * A new group and who starts in it.
 *
 * <p>The caller is not listed: they are the owner by virtue of creating it, and
 * accepting them in the list would invite a request that leaves them out.
 *
 * @param title     the name every member sees in their conversation list
 * @param memberIds everyone else to start with; each must share a group with
 *                  the caller, which is what permits messaging them at all
 */
public record CreateGroupRequest(
        @NotBlank(message = "Tên nhóm không được để trống")
        @Size(max = 120, message = "Tên nhóm tối đa 120 ký tự")
        String title,

        @NotEmpty(message = "Nhóm cần ít nhất một thành viên khác")
        @Size(max = 49, message = "Nhóm tối đa 50 người, kể cả bạn")
        List<UUID> memberIds
) {}
