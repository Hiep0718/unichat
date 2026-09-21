package com.unichat.core.workchat.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Text of a new message.
 *
 * @param body the message; blank is rejected rather than stored as an empty row
 */
public record SendMessageRequest(
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 4000, message = "Tin nhắn tối đa 4000 ký tự")
        String body
) {}
