package com.unichat.core.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Input request body for registering a new user.
 */
public record RegisterRequest(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    @Size(max = 254, message = "Email tối đa 254 ký tự")
    String email,

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 12, max = 128, message = "Mật khẩu phải từ 12 đến 128 ký tự")
    String password
) {}
