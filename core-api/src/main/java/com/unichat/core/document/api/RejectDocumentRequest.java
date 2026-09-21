package com.unichat.core.document.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request payload for declining a contributed document.
 *
 * @param reason explanation shown to the contributor
 */
public record RejectDocumentRequest(
        @NotBlank(message = "Lý do từ chối là bắt buộc")
        @Size(max = 500, message = "Lý do từ chối không được vượt quá 500 ký tự")
        String reason
) {}
