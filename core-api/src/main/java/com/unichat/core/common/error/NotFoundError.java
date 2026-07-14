package com.unichat.core.common.error;

import java.io.Serial;

import org.springframework.http.HttpStatus;

/**
 * Represents a resource that is not visible or does not exist.
 */
public final class NotFoundError extends AppError {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Creates a not-found failure with a safe client detail.
     *
     * @param detail user-facing not-found detail
     */
    public NotFoundError(String detail) {
        super("NOT_FOUND", HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên", detail);
    }
}
