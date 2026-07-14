package com.unichat.core.common.error;

import java.io.Serial;

import org.springframework.http.HttpStatus;

/**
 * Represents an authenticated actor lacking permission for an operation.
 */
public final class AuthorizationError extends AppError {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Creates an authorization failure with a safe client detail.
     *
     * @param detail user-facing authorization detail
     */
    public AuthorizationError(String detail) {
        super("FORBIDDEN", HttpStatus.FORBIDDEN, "Không có quyền truy cập", detail);
    }
}
