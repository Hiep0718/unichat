package com.unichat.core.chat.service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.unichat.core.common.error.NotFoundError;

/** Locks conversation ownership and allocates sequence numbers inside short transactions. */
@Repository
public class ChatConversationStore {
    private final JdbcTemplate database;
    /** Uses parameterized SQL against the existing conversation boundary. */
    public ChatConversationStore(JdbcTemplate database) { this.database = database; }
    /** Acquires account state before conversation/source locks for protected mutations. */
    public void lockActor(UUID actorId) {
        database.queryForObject("SELECT id FROM users WHERE id=? FOR UPDATE",UUID.class,actorId);
    }
    /** Locks an existing owned conversation or creates the server's result conversation. */
    public UUID reserve(ChatActor actor, ChatBinding binding, Instant now) {
        if (binding.conversationId() != null) {
            requireOwner(actor.userId(), binding.workspaceId(), binding.conversationId(), true);
            return binding.conversationId();
        }
        UUID id = UUID.randomUUID();
        database.update("INSERT INTO conversations(id,workspace_id,user_id,title,status,created_at,updated_at) VALUES(?,?,?,?,'ACTIVE',?,?)",
                id, binding.workspaceId(), actor.userId(), title(binding.question()), Timestamp.from(now), Timestamp.from(now));
        return id;
    }
    /** Returns 404 for wrong owner, path binding or deleted conversation. */
    public void requireOwner(UUID actorId, UUID workspaceId, UUID conversationId, boolean lock) {
        var matches = database.queryForList("SELECT id FROM conversations WHERE id=? AND user_id=? AND workspace_id=? AND status='ACTIVE'"
                + (lock ? " FOR UPDATE" : ""), UUID.class, conversationId, actorId, workspaceId);
        if (matches.isEmpty()) throw new NotFoundError("Hội thoại không tồn tại.");
    }
    /** Atomically allocates the next sequence; timestamps never determine page positions. */
    public long nextSequence(UUID conversationId, Instant now) {
        return database.queryForObject("UPDATE conversations SET next_sequence=next_sequence+1, updated_at=? WHERE id=? AND status='ACTIVE' RETURNING next_sequence-1",
                Long.class, Timestamp.from(now), conversationId);
    }
    /** Holds source/permission rows through final persistence so revocation cannot race the commit. */
    public void lockSources(ChatActor actor, UUID workspaceId) {
        database.queryForList("SELECT id FROM workspaces WHERE id=? FOR SHARE", workspaceId);
        database.queryForList("SELECT workspace_id FROM workspace_members WHERE workspace_id=? AND user_id=? FOR SHARE", workspaceId, actor.userId());
        database.queryForList("SELECT id FROM documents WHERE workspace_id=? ORDER BY id FOR SHARE", workspaceId);
    }
    private String title(String question) { return question.length() > 80 ? question.substring(0,80) + "…" : question; }
}
