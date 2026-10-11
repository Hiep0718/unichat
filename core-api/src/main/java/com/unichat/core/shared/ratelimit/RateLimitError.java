package com.unichat.core.shared.ratelimit;

import org.springframework.http.HttpStatus;
import com.unichat.core.common.error.AppError;

/** Durable quota exhaustion with a bounded retry interval. */
public final class RateLimitError extends AppError {
    private final long retryAfter;
    /** Creates a safe 429 response without exposing quota subjects. */
    public RateLimitError(long retryAfter) {
        super("RATE_LIMITED", HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu", "Vui lòng chờ trước khi thử lại.");
        this.retryAfter = Math.max(1, retryAfter);
    }
    /** Returns seconds until the current window ends. */
    public long getRetryAfter() { return retryAfter; }
}
