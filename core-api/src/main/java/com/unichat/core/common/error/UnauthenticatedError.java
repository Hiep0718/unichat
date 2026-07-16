package com.unichat.core.common.error;

import java.io.Serial;

import org.springframework.http.HttpStatus;

/**
 * Represents a failure to authenticate the client actor.
 */
public final class UnauthenticatedError extends AppError {

    @Serial
    private static final long serialVersionUID = 1L;

    /**
     * Creates an unauthenticated failure.
     */
    public UnauthenticatedError(String detail) {
        super("UNAUTHENTICATED", HttpStatus.UNAUTHORIZED, "Chưa xác thực tài khoản", detail);
    }
}
