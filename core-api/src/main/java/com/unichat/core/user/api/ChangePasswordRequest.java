package com.unichat.core.user.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for changing the authenticated user's password.
 */
public record ChangePasswordRequest(
    @NotBlank(message = "Mật khẩu hiện tại không được để trống")
    String currentPassword,

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 12, max = 128, message = "Mật khẩu mới phải từ 12 đến 128 ký tự")
    String newPassword
) {}
