package com.unichat.core.admin.domain;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import com.unichat.core.admin.api.ProviderAttemptRequest;
import com.unichat.core.common.error.ConflictError;

/** One physical provider call, distinguished from its logical chat operation. */
@Entity
@Table(name = "provider_attempts")
public class ProviderAttempt {
    @Id private UUID id;
    @Column(name = "operation_id") private UUID operationId;
    @Column(nullable = false) private String purpose;
    @Column(nullable = false) private String provider;
    @Column(name = "key_id", nullable = false) private String keyId;
    @Column(nullable = false) private String model;
    @Column(name = "started_at", nullable = false) private Instant startedAt;
    @Column(name = "ended_at") private Instant endedAt;
    private String outcome;
    @Column(name = "latency_ms") private Long latencyMs;
    @Column(name = "input_tokens") private Long inputTokens;
    @Column(name = "output_tokens") private Long outputTokens;
    @Column(name = "error_code") private String errorCode;
    protected ProviderAttempt() { }
    /** Verifies immutable provider attribution before accepting a replay/update. */
    public void verifyIdentity(ProviderAttemptRequest request) {
        if (!java.util.Objects.equals(operationId, request.operationId()) || !purpose.equals(request.purpose())
                || !provider.equals(request.provider()) || !keyId.equals(request.keyId()) || !model.equals(request.model()))
            throw new ConflictError("Provider attempt identity does not match.");
    }
    /** Terminal metadata is immutable, including nullable unknown usage. */
    public void finish(ProviderAttemptRequest request) {
        if (endedAt != null) {
            if (!sameResult(request)) throw new ConflictError("Provider attempt already completed.");
            return;
        }
        if (request.occurredAt().isBefore(startedAt)) throw new ConflictError("Provider attempt timestamps are invalid.");
        endedAt = request.occurredAt(); outcome = request.outcome(); latencyMs = request.latencyMs();
        inputTokens = request.inputTokens(); outputTokens = request.outputTokens(); errorCode = request.errorCode();
    }
    private boolean sameResult(ProviderAttemptRequest request) {
        return endedAt.equals(request.occurredAt()) && java.util.Objects.equals(outcome, request.outcome())
                && java.util.Objects.equals(latencyMs, request.latencyMs())
                && java.util.Objects.equals(inputTokens, request.inputTokens())
                && java.util.Objects.equals(outputTokens, request.outputTokens())
                && java.util.Objects.equals(errorCode, request.errorCode());
    }
}
