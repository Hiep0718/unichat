package com.unichat.core.auth.api;

import org.springframework.http.HttpStatus;
import com.unichat.core.common.error.AppError;

/** Rejects mixed or unsupported refresh credential transports before any rotation. */
public final class InvalidTransportError extends AppError {
    private static final long serialVersionUID = 1L;
    /** Uses HTTP 400 for an invalid transport matrix. */
    public InvalidTransportError() {
        super("INVALID_AUTH_TRANSPORT", HttpStatus.BAD_REQUEST, "Yêu cầu không hợp lệ",
                "Vui lòng sử dụng đúng phương thức đăng nhập của ứng dụng.");
    }
}
