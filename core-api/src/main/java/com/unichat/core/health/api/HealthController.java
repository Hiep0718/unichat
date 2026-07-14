package com.unichat.core.health.api;

import java.time.Clock;
import java.time.Instant;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes the public liveness endpoint for local and orchestrated checks.
 */
@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    private final Clock clock;

    /**
     * Creates a health endpoint using the injected clock.
     *
     * @param clock clock used to produce deterministic timestamps
     */
    public HealthController(Clock clock) {
        this.clock = clock;
    }

    /**
     * Returns the current Core API liveness state.
     *
     * @return successful health response
     */
    @GetMapping
    public ResponseEntity<HealthResponse> getHealth() {
        var response = new HealthResponse("ok", "core-api", Instant.now(clock));
        return ResponseEntity.ok(response);
    }
}