package com.unichat.core.admin.service;

import java.time.Clock;
import java.time.Instant;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.admin.api.ProviderAttemptRequest;
import com.unichat.core.admin.domain.ProviderAttemptRepository;
import com.unichat.core.common.error.ConflictError;
import com.unichat.core.common.error.ValidationError;

/** Idempotently records physical model calls; START must commit before the call proceeds. */
@Service
public class ProviderAttemptService {
    private final EntityManager entityManager;
    private final ProviderAttemptRepository repository;
    private final Clock clock;
    /** Uses PostgreSQL uniqueness for replay protection across workers. */
    public ProviderAttemptService(EntityManager entityManager, ProviderAttemptRepository repository, Clock clock) {
        this.entityManager = entityManager; this.repository = repository; this.clock = clock;
    }
    /** Accepts validated metadata with immutable attribution and terminal results. */
    @Transactional
    public void record(ProviderAttemptRequest request) {
        validate(request);
        if ("START".equals(request.phase())) insertStart(request);
        var attempt = repository.lockById(request.attemptId())
                .orElseThrow(() -> new ConflictError("Provider attempt has no committed START."));
        attempt.verifyIdentity(request);
        if ("END".equals(request.phase())) attempt.finish(request);
    }
    private void validate(ProviderAttemptRequest request) {
        if (request.occurredAt().isAfter(Instant.now(clock).plusSeconds(60)))
            throw new ValidationError("Provider timestamp is invalid.");
        if ("END".equals(request.phase()) && request.outcome() == null)
            throw new ValidationError("Terminal provider outcome is required.");
        if ("START".equals(request.phase()) && (request.outcome() != null || request.latencyMs() != null
                || request.inputTokens() != null || request.outputTokens() != null || request.errorCode() != null))
            throw new ValidationError("START must not contain terminal metadata.");
    }
    private void insertStart(ProviderAttemptRequest request) {
        entityManager.createNativeQuery("INSERT INTO provider_attempts "
                + "(id,operation_id,purpose,provider,key_id,model,started_at) VALUES "
                + "(:id,:operationId,:purpose,:provider,:keyId,:model,:startedAt) ON CONFLICT (id) DO NOTHING")
                .setParameter("id", request.attemptId()).setParameter("operationId", request.operationId())
                .setParameter("purpose", request.purpose()).setParameter("provider", request.provider())
                .setParameter("keyId", request.keyId()).setParameter("model", request.model())
                .setParameter("startedAt", request.occurredAt()).executeUpdate();
    }
}
