package com.unichat.core.common.error;

import java.io.Serial;

import org.springframework.http.HttpStatus;

/**
 * Represents a conflict in resource state or unique constraints.
 */
public final class ConflictError extends AppError {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Creates a conflict failure.
     */
    public ConflictError(String detail) {
        super("CONFLICT", HttpStatus.CONFLICT, "Xung đột dữ liệu", detail);
    }
}
