package com.unichat.core.common.error;

import java.io.Serial;

import org.springframework.http.HttpStatus;

/**
 * Represents an unexpected server-side failure hidden behind a safe response.
 */
public final class InternalError extends AppError {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Creates the standard internal error response.
     */
    public InternalError() {
        super("INTERNAL_ERROR", HttpStatus.INTERNAL_SERVER_ERROR,
            "Lỗi hệ thống", "Hệ thống không thể xử lý yêu cầu lúc này.");
    }
}
