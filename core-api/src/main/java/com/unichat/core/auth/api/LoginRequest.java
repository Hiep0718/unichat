package com.unichat.core.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Input request body for authenticating a user.
 */
public record LoginRequest(
    @NotBlank(message = "Email không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    @Size(max = 254)
    String email,

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(max = 128)
    String password
) {}
