package com.unichat.core.health.api;

import java.time.Instant;

/**
 * Public health response contract.
 *
 * @param status service status
 * @param service stable service identifier
 * @param timestamp server timestamp in UTC
 */
public record HealthResponse(String status, String service, Instant timestamp) {
}