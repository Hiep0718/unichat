package com.unichat.core.workchat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A group's new name.
 *
 * @param title the name shown in every member's conversation list
 */
public record RenameGroupRequest(
        @NotBlank(message = "Tên nhóm không được để trống")
        @Size(max = 120, message = "Tên nhóm tối đa 120 ký tự")
        String title
) {}
