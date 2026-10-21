package com.unichat.core.admin.service;

import org.springframework.http.HttpStatus;
import com.unichat.core.common.error.AppError;

/** Safe retryable rejection when generation admission is closed or unavailable. */
public final class AiMaintenanceError extends AppError {
    /** Exposes no database or provider details. */
    public AiMaintenanceError() {
        super("AI_MAINTENANCE", HttpStatus.SERVICE_UNAVAILABLE, "AI đang bảo trì",
                "Dịch vụ AI đang bảo trì. Vui lòng thử lại sau.");
    }
}
