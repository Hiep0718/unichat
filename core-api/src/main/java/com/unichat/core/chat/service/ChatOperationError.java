package com.unichat.core.chat.service;

import org.springframework.http.HttpStatus;
import com.unichat.core.common.error.AppError;

/** Stable operation failures with safe public descriptions. */
public final class ChatOperationError extends AppError {
    /** Creates an expected conflict, expiry or provider failure. */
    public ChatOperationError(String code, HttpStatus status, String detail) {
        super(code, status, "Không thể xử lý hội thoại", detail);
    }
}
