package com.unichat.core.common.error;

import org.springframework.http.HttpStatus;

/**
 * Typed error thrown when an uploaded document file is rejected due to size or format.
 */
public final class FileRejectedError extends AppError {

    public FileRejectedError(String detail) {
        super(
            "FILE_REJECTED",
            HttpStatus.BAD_REQUEST,
            "Tệp bị từ chối",
            detail
        );
    }
}
