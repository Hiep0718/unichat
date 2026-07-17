package com.unichat.core.shared.idempotency;

import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Persistence layer for API idempotency records.
 */
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, IdempotencyRecordId> {

    /**
     * Deletes expired idempotency records.
     */
    void deleteByExpiresAtBefore(Instant now);
}
