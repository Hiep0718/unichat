package com.unichat.core.shared.idempotency;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unichat.core.common.error.ConflictError;

/**
 * Service orchestrating validation and storage of idempotent API operations.
 */
@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository repository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public IdempotencyService(
            IdempotencyRecordRepository repository,
            ObjectMapper objectMapper,
            Clock clock) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /**
     * Computes the SHA-256 base64 hash of a request payload.
     */
    public String computeHash(Object body) {
        if (body == null) {
            return "";
        }
        try {
            String json = objectMapper.writeValueAsString(body);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to serialize body for idempotency hashing", e);
        }
    }

    /**
     * Looks up an existing idempotency record.
     */
    @Transactional(readOnly = true)
    public Optional<IdempotencyRecord> getRecord(String actorId, String routeKey, String key) {
        return repository.findById(new IdempotencyRecordId(actorId, routeKey, key));
    }

    /**
     * Saves a completed response for future duplicate requests.
     */
    @Transactional
    public void saveRecord(String actorId, String routeKey, String key, String hash, int status, Object responseBody) {
        try {
            String bodyJson = objectMapper.writeValueAsString(responseBody);
            Instant expiresAt = Instant.now(clock).plus(24, ChronoUnit.HOURS);
            IdempotencyRecord record = new IdempotencyRecord(
                    actorId, routeKey, key, hash, status, bodyJson, expiresAt
            );
            repository.save(record);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to save idempotency response mapping", e);
        }
    }

    /**
     * Verifies that the payload of a duplicate request matches the original payload.
     * Throws 409 Conflict if they differ.
     */
    public void handleConflict(IdempotencyRecord record, String currentHash) {
        if (!record.getRequestHash().equals(currentHash)) {
            throw new ConflictError("Trùng Idempotency-Key nhưng nội dung yêu cầu khác nhau.");
        }
    }
}
