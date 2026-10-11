package com.unichat.core.chat.api;

import java.io.Serial;
import org.springframework.http.HttpStatus;
import com.unichat.core.common.error.AppError;

/** Reports malformed or unsupported pagination parameters as HTTP 400. */
public final class ChatQueryError extends AppError {
    @Serial
    private static final long serialVersionUID = 1L;

    /** Creates a safe pagination error without reflecting supplied query values. */
    public ChatQueryError(String detail) {
        super("INVALID_QUERY", HttpStatus.BAD_REQUEST, "Tham số không hợp lệ", detail);
    }
}
