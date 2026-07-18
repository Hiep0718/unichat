package com.unichat.core.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    String email,

    @NotBlank(message = "Mã OTP không được để trống")
    @Size(min = 6, max = 6, message = "Mã OTP phải đúng 6 ký tự")
    String otp,

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 12, max = 128, message = "Mật khẩu mới phải từ 12 đến 128 ký tự")
    String newPassword
) {}
