package com.unichat.core.admin.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

/** Durable metadata aggregation and terminal attempt locking. */
public interface ProviderAttemptRepository extends JpaRepository<ProviderAttempt, UUID> {
    /** Serializes terminal updates and verifies duplicate END payloads. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProviderAttempt p WHERE p.id = :id")
    Optional<ProviderAttempt> lockById(@Param("id") UUID id);
    /** Earliest retained sample, making incomplete windows explicit. */
    @Query("SELECT MIN(p.startedAt) FROM ProviderAttempt p")
    Instant earliestSample();
}
