package com.unichat.core.shared.servicesecurity;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.unichat.core.common.error.UnauthenticatedError;

/** Consumes service nonces atomically across workers and service directions. */
@Service
public class ServiceNonceService {
    private final JdbcTemplate database;
    private final Clock clock;
    /** Uses the durable Core security store. */
    public ServiceNonceService(JdbcTemplate database, Clock clock) { this.database = database; this.clock = clock; }
    /** Rejects expired, overly long and replayed identities without retaining raw tokens. */
    @Transactional
    public void consume(String identity, UUID nonce, Instant expiresAt) {
        Instant now = Instant.now(clock);
        if (!expiresAt.isAfter(now) || expiresAt.isAfter(now.plusSeconds(60))) denied();
        int inserted = database.update("INSERT INTO service_nonces(identity,nonce,expires_at) VALUES(?,?,?) ON CONFLICT DO NOTHING",
                identity, nonce, Timestamp.from(expiresAt));
        if (inserted != 1) denied();
    }
    private void denied() { throw new UnauthenticatedError("Danh tính dịch vụ không hợp lệ."); }
}
