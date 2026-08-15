package com.unichat.core.shared.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Issues service authentication tokens for internal AI Service calls.
 * P0: Uses shared-secret token header. Will be upgraded to RS256 signed JWT in hardening phase.
 */
@Component
public class ServiceTokenIssuer {

    @Value("${unichat.ai-service.internal-key:unichat-internal-service-key-dev}")
    private String internalServiceKey;

    /**
     * Returns Authorization header value for internal service calls.
     */
    public String issueToken() {
        return "Bearer " + internalServiceKey;
    }
}
