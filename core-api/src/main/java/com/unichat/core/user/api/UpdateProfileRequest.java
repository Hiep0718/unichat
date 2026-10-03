package com.unichat.core.user.api;

import com.unichat.core.user.domain.User;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A change to the caller's own profile.
 *
 * @param displayName the name others see; the mention handle is not affected,
 *                    since that has to stay unique and stable
 */
public record UpdateProfileRequest(
        @NotBlank(message = "Tên hiển thị không được để trống")
        @Size(max = User.MAX_DISPLAY_NAME, message = "Tên hiển thị tối đa 50 ký tự")
        String displayName
) {}
