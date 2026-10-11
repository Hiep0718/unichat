package com.unichat.core.chat.domain;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.unichat.core.chat.service.ChatActor;
import com.unichat.core.chat.service.ChatJson;
import com.unichat.core.chat.service.ChatSourceSnapshot;

/** Parameterized persistence and conditional terminal transitions for chat operations. */
@Repository
public class ChatOperationRepository {
    private final JdbcTemplate database;
    private final ChatJson json;
    /** Shares the caller's transaction for reservations and final commits. */
    public ChatOperationRepository(JdbcTemplate database, ChatJson json) { this.database = database; this.json = json; }
    /** Serializes actor reservations with account mutations and refresh revocation. */
    public void lockActor(UUID actorId) {
        database.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", UUID.class, actorId);
    }
    /** Resolves a retry across stream and nonstream using one namespace. */
    public Optional<ChatOperation> findByKey(UUID actorId, UUID key) {
        return database.query("SELECT * FROM chat_operations WHERE actor_id = ? AND operation_name = 'chat.ask' AND idempotency_key = ?",
                this::map, actorId, key).stream().findFirst();
    }
    /** Reads an operation; ownership is enforced by its service. */
    public Optional<ChatOperation> findById(UUID id) {
        return database.query("SELECT * FROM chat_operations WHERE id = ?", this::map, id).stream().findFirst();
    }
    /** Locks the operation before completion/cancel; whichever terminal commit wins stays terminal. */
    public ChatOperation lock(UUID id) {
        return database.queryForObject("SELECT * FROM chat_operations WHERE id = ? FOR UPDATE", this::map, id);
    }
    /** Counts durable concurrency slots after expiring abandoned operations. */
    public long running(UUID actorId) {
        return database.queryForObject("SELECT count(*) FROM chat_operations WHERE actor_id = ? AND state = 'RUNNING'", Long.class, actorId);
    }
    /** Returns whether a conversation already has an active turn. */
    public boolean busy(UUID conversationId) {
        return database.queryForObject("SELECT count(*) FROM chat_operations WHERE conversation_id = ? AND state = 'RUNNING'",
                Long.class, conversationId) > 0;
    }
    /** Inserts immutable binding, lease, source policy and user-message result pointers. */
    public void insert(ChatOperation operation, Instant now) {
        database.update("""
                INSERT INTO chat_operations(id, actor_id, idempotency_key, binding_hash, workspace_id,
                original_conversation_id, conversation_id, user_message_id, question, expanded, session_id,
                security_version, request_id, state, source_fingerprint, source_snapshot, created_at,
                deadline_at, lease_until, expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'RUNNING',?,?::jsonb,?,?,?,?)
                """, operation.id(), operation.actor().userId(), operation.key(), operation.bindingHash(), operation.workspaceId(),
                operation.originalConversationId(), operation.conversationId(), operation.userMessageId(), operation.question(),
                operation.expanded(), operation.actor().sessionId(), operation.actor().securityVersion(), operation.requestId(),
                operation.sources().fingerprint(), json.write(operation.sources()), Timestamp.from(now),
                Timestamp.from(operation.deadlineAt()), Timestamp.from(operation.leaseUntil()), Timestamp.from(operation.expiresAt()));
    }
    /** Performs a terminal compare-and-set inside the caller's transaction. */
    public boolean terminal(UUID id, String state, UUID messageId, String errorCode, Instant now) {
        return database.update("UPDATE chat_operations SET state=?, result_message_id=?, error_code=?, terminal_at=? WHERE id=? AND state='RUNNING'",
                state, messageId, errorCode, Timestamp.from(now), id) == 1;
    }
    /** Extends a live lease without extending the absolute deadline. */
    public boolean heartbeat(UUID id, Instant now) {
        return database.update("UPDATE chat_operations SET lease_until=LEAST(deadline_at, ?) WHERE id=? AND state='RUNNING' AND deadline_at>? AND lease_until>?",
                Timestamp.from(now.plusSeconds(45)), id, Timestamp.from(now), Timestamp.from(now)) == 1;
    }
    /** Marks crashes/deadlines as unknown failures and releases durable permits. */
    public java.util.List<ChatOperation> expire(UUID actorId, Instant now) {
        return database.query("UPDATE chat_operations SET state='FAILED', error_code='RESULT_UNCERTAIN', terminal_at=? WHERE actor_id=? AND state='RUNNING' AND (lease_until<=? OR deadline_at<=?) RETURNING *",
                this::map,
                Timestamp.from(now), actorId, Timestamp.from(now), Timestamp.from(now));
    }
    /** Lists a bounded batch of actors needing lease cleanup without acquiring operation locks. */
    public java.util.List<UUID> expiredActors(Instant now) {
        return database.queryForList("SELECT DISTINCT actor_id FROM chat_operations WHERE state='RUNNING' AND (lease_until<=? OR deadline_at<=?) ORDER BY actor_id LIMIT 100",
                UUID.class, Timestamp.from(now), Timestamp.from(now));
    }
    /** Records a measured TTFT only when an actual provisional token is received. */
    public void firstToken(UUID id, Instant now) {
        database.update("UPDATE chat_operations SET first_token_at=? WHERE id=? AND state='RUNNING' AND first_token_at IS NULL",
                Timestamp.from(now),id);
    }
    private ChatOperation map(ResultSet row, int index) throws SQLException {
        return new ChatOperation(uuid(row,"id"), new ChatActor(uuid(row,"actor_id"), uuid(row,"session_id"), row.getLong("security_version")),
                uuid(row,"idempotency_key"), row.getString("binding_hash"), uuid(row,"workspace_id"), uuid(row,"original_conversation_id"),
                uuid(row,"conversation_id"), uuid(row,"user_message_id"), uuid(row,"result_message_id"), row.getString("question"),
                row.getBoolean("expanded"), row.getString("request_id"), row.getString("state"),
                json.read(row.getString("source_snapshot"), ChatSourceSnapshot.class), row.getString("error_code"),
                row.getTimestamp("deadline_at").toInstant(), row.getTimestamp("lease_until").toInstant(), row.getTimestamp("expires_at").toInstant());
    }
    private UUID uuid(ResultSet row, String column) throws SQLException { return row.getObject(column, UUID.class); }
}
