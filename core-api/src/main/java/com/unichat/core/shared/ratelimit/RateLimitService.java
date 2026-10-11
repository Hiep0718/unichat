package com.unichat.core.shared.ratelimit;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import com.unichat.core.shared.servicesecurity.RequestBinding;

/** Coordinates fixed-window quotas across processes through PostgreSQL. */
@Service
public class RateLimitService {
    private final JdbcTemplate database;
    private final Clock clock;
    private final TransactionTemplate transaction;
    /** Uses an independent transaction so rejected requests cannot undo usage. */
    public RateLimitService(JdbcTemplate database, Clock clock, PlatformTransactionManager manager) {
        this.database = database; this.clock = clock;
        this.transaction = new TransactionTemplate(manager);
        transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }
    /** Charges one request or raises a typed 429 after committing the counter. */
    public void consume(String subject, String action, int maxRequests, Duration window) {
        if (maxRequests < 1 || window.toSeconds() < 1) throw new IllegalArgumentException("Invalid quota configuration");
        long seconds = window.toSeconds();
        long now = Instant.now(clock).getEpochSecond();
        long start = Math.floorDiv(now, seconds) * seconds;
        String hash = RequestBinding.hash(subject.getBytes(StandardCharsets.UTF_8));
        Integer count = transaction.execute(status -> increment(hash, action, start));
        if (count != null && count > maxRequests) throw new RateLimitError(start + seconds - now);
    }
    private int increment(String subject, String action, long start) {
        return database.queryForObject("""
                INSERT INTO security_rate_windows(subject_hash, action, window_start, request_count)
                VALUES (?, ?, ?, 1) ON CONFLICT(subject_hash, action, window_start)
                DO UPDATE SET request_count = security_rate_windows.request_count + 1
                RETURNING request_count
                """, Integer.class, subject, action, start);
    }
}
