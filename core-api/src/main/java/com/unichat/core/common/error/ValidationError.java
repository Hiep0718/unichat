package com.unichat.core.common.error;

import java.io.Serial;

import org.springframework.http.HttpStatus;

/**
 * Represents input that cannot be accepted by the application boundary.
 */
public final class ValidationError extends AppError {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Creates a validation failure with a safe client detail.
     *
     * @param detail user-facing validation detail
     */
    public ValidationError(String detail) {
        super("VALIDATION_ERROR", HttpStatus.UNPROCESSABLE_CONTENT,
            "Dữ liệu không hợp lệ", detail);
    }
}
