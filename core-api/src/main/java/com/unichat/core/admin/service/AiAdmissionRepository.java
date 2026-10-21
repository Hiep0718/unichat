package com.unichat.core.admin.service;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.unichat.core.admin.api.AiAdmissionResponse;

/** PostgreSQL singleton locking; callers must hold a short database transaction. */
@Repository
public class AiAdmissionRepository {
    private final JdbcTemplate database;
    /** Uses the same authoritative database transaction as chat/attempt writes. */
    public AiAdmissionRepository(JdbcTemplate database) { this.database = database; }
    /** Locks before actor, conversation or attempt locks to serialize admission transitions. */
    public AiAdmissionResponse lock(boolean exclusive) {
        return database.queryForObject("SELECT state,version FROM ai_generation_control WHERE id=1 "
                + (exclusive ? "FOR UPDATE" : "FOR SHARE"),
                (row, index) -> new AiAdmissionResponse(row.getString("state"), row.getLong("version"), 0, 0));
    }
    /** Counts all running work and unknown pending physical calls without discarding them. */
    public AiAdmissionResponse counts(AiAdmissionResponse control) {
        return database.queryForObject("SELECT (SELECT count(*) FROM chat_operations WHERE state='RUNNING') AS running, "
                + "(SELECT count(*) FROM provider_attempts WHERE ended_at IS NULL) AS pending",
                (row, index) -> new AiAdmissionResponse(control.state(), control.version(),
                        row.getLong("running"), row.getLong("pending")));
    }
    /** Updates metadata only while the singleton exclusive lock is held. */
    public void update(String state, UUID actorId) {
        database.update("UPDATE ai_generation_control SET state=?,version=version+1,updated_at=now(),updated_by=? WHERE id=1",
                state, actorId);
    }
}
