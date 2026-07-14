package com.unichat.core.common.error;

import java.io.Serial;
import java.util.Objects;

import org.springframework.http.HttpStatus;

/**
 * Base type for expected application failures exposed through the API boundary.
 */
public abstract class AppError extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final String code;
    private final HttpStatus status;
    private final String title;

    /**
     * Creates an expected application failure.
     *
     * @param code stable machine-readable error code
     * @param status HTTP status returned to the client
     * @param title short user-facing error title
     * @param detail safe user-facing error detail
     */
    protected AppError(String code, HttpStatus status, String title, String detail) {
        super(Objects.requireNonNull(detail));
        this.code = Objects.requireNonNull(code);
        this.status = Objects.requireNonNull(status);
        this.title = Objects.requireNonNull(title);
    }

    /**
     * Returns the stable machine-readable error code.
     *
     * @return error code
     */
    public String getCode() {
        return code;
    }

    /**
     * Returns the HTTP status associated with this failure.
     *
     * @return HTTP status
     */
    public HttpStatus getStatus() {
        return status;
    }

    /**
     * Returns the safe user-facing title.
     *
     * @return error title
     */
    public String getTitle() {
        return title;
    }
}
