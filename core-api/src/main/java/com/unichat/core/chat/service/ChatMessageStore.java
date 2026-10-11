package com.unichat.core.chat.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.unichat.core.chat.api.MessagePageResponse;
import com.unichat.core.chat.api.MessageResponse;
import com.unichat.core.chat.api.QuestionResponse;
import com.unichat.core.chat.domain.ChatOperation;
import com.unichat.core.common.error.NotFoundError;

/** Stores complete results and rebuilds source-safe history instead of replaying raw cache JSON. */
@Repository
public class ChatMessageStore {
    private static final String REDACTED = "Nội dung không còn khả dụng do quyền nguồn thay đổi hoặc thiếu thông tin xác minh.";
    private final JdbcTemplate database;
    private final ChatJson json;
    private final ChatConversationStore conversations;
    /** Uses the caller's transaction for messages, citations and dependencies. */
    public ChatMessageStore(JdbcTemplate database, ChatJson json, ChatConversationStore conversations) {
        this.database = database; this.json = json; this.conversations = conversations;
    }
    /** Reserves exactly one user message with a stable sequence. */
    public UUID user(UUID conversationId, String question, Instant now) {
        UUID id = UUID.randomUUID();
        database.update("INSERT INTO messages(id,conversation_id,role,content,sequence_no,created_at) VALUES(?,?,'USER',?,?,?)",
                id, conversationId, question, conversations.nextSequence(conversationId, now), Timestamp.from(now));
        return id;
    }
    /** Persists assistant content, canonical structure and genuine citation/dependency metadata. */
    public void assistant(ChatOperation operation, QuestionResponse result, String provider, Instant now) {
        database.update("""
                INSERT INTO messages(id,conversation_id,role,content,intent,refusal_code,provider_model,prompt_version,
                sequence_no,source_fingerprint,canonical_result,created_at) VALUES(?,?,'ASSISTANT',?,?,?,?,?,?,?,?::jsonb,?)
                """, result.messageId(),operation.conversationId(),result.answer(),result.intent(),result.refusalCode(),provider,
                result.strategyVersion(),conversations.nextSequence(operation.conversationId(),now),operation.sources().fingerprint(),json.write(result),Timestamp.from(now));
        dependencies(operation, result.messageId());
        int ordinal = 0;
        for (var citation : result.citations()) database.update("""
                INSERT INTO citation_history(id,message_id,document_id,chunk_id,file_name,locator_type,locator_value,
                excerpt,content_hash,ordinal,ingestion_version,citation_id,score) VALUES(?,?,?,?,?,'LOCATOR',?,?,?,?,?,?,?)
                """, UUID.randomUUID(),result.messageId(),citation.documentId(),citation.chunkId(),citation.fileName(),
                citation.locator(),citation.excerpt(),citation.contentHash(),++ordinal,citation.ingestionVersion(),citation.citationId(),citation.score());
    }
    /** Rebuilds an operation result after checking current source visibility. */
    public QuestionResponse result(ChatOperation operation, ChatSourceSnapshot current) {
        return database.query("SELECT * FROM messages WHERE id=? AND conversation_id=?", (row,index) -> {
            if (!visible(row,current)) return redactedResult(operation);
            QuestionResponse saved = json.read(row.getString("canonical_result"),QuestionResponse.class);
            return new QuestionResponse(saved.messageId(),operation.conversationId(),saved.decision(),saved.answer(),saved.intent(),
                    saved.strategyVersion(),saved.citations(),saved.refusalCode(),operation.requestId(),saved.evidenceScore(),
                    saved.singleSourceWarning(),saved.warningMessage(),operation.id(),saved.knowledgeMode(),saved.sections());
        },operation.resultMessageId(),operation.conversationId()).stream().findFirst().orElseThrow(() -> new NotFoundError("Kết quả không tồn tại."));
    }
    /** Lists stable anchored pages without loading an unbounded conversation. */
    public MessagePageResponse page(UUID conversationId, ChatSourceSnapshot current, int page, int size, Long snapshot) {
        long latest = database.queryForObject("SELECT COALESCE(max(sequence_no),0) FROM messages WHERE conversation_id=?",Long.class,conversationId);
        long anchor = snapshot == null ? latest : Math.min(snapshot,latest);
        long total = database.queryForObject("SELECT count(*) FROM messages WHERE conversation_id=? AND sequence_no<=?",Long.class,conversationId,anchor);
        List<MessageResponse> descending = database.query("SELECT * FROM messages WHERE conversation_id=? AND sequence_no<=? ORDER BY sequence_no DESC LIMIT ? OFFSET ?",
                (row,index) -> response(row,current),conversationId,anchor,size,(long)page*size);
        var chronological = new ArrayList<>(descending);
        Collections.reverse(chronological);
        return new MessagePageResponse(List.copyOf(chronological),page,size,total,(int)((total+size-1)/size),anchor);
    }
    /** Supplies at most ten recent exchanges; unverified assistant context is excluded. */
    public List<Map<String,Object>> history(UUID conversationId, ChatSourceSnapshot current, UUID pendingUserMessageId) {
        return page(conversationId,current,0,21,null).content().stream()
                .filter(message -> !message.id().equals(pendingUserMessageId) && !message.redacted())
                .map(message -> Map.<String,Object>of("role",message.role(),"content",contextContent(message.content()),
                        "sources","ASSISTANT".equals(message.role()) ? current.sources() : List.of())).toList();
    }
    /** Only returns a summary whose complete source fingerprint still matches. */
    public String summary(UUID conversationId, ChatSourceSnapshot current) {
        return database.query("SELECT summary FROM conversations WHERE id=? AND summary_fingerprint=? AND summary IS NOT NULL",
                (row,index) -> row.getString(1),conversationId,current.fingerprint()).stream().findFirst().orElse(null);
    }
    /** Saves a summary conditionally; losing compaction never undoes a valid answer. */
    public void summary(UUID conversationId, ChatSourceSnapshot current, String summary, int expectedVersion) {
        if (summary == null || summary.isBlank()) return;
        database.update("UPDATE conversations SET summary=?,summary_fingerprint=?,summary_version=summary_version+1 WHERE id=? AND status='ACTIVE' AND summary_version=?",
                summary,current.fingerprint(),conversationId,expectedVersion);
    }
    /** Returns the optimistic summary revision to bind an AI request. */
    public int summaryVersion(UUID conversationId) {
        return database.queryForObject("SELECT summary_version FROM conversations WHERE id=?",Integer.class,conversationId);
    }
    /** Checks whether a selected source message may be inherited by a note. */
    public boolean sourceMessage(UUID id, UUID conversationId, ChatSourceSnapshot current) {
        return database.query("SELECT * FROM messages WHERE id=? AND conversation_id=? AND role='ASSISTANT'",
                (row,index) -> visible(row,current),id,conversationId).stream().findFirst().orElse(false);
    }
    private void dependencies(ChatOperation operation, UUID messageId) {
        for (var source : operation.sources().sources()) database.update("INSERT INTO chat_source_dependencies(message_id,document_id,ingestion_version,document_hash) VALUES(?,?,?,?)",
                messageId,source.documentId(),source.ingestionVersion(),source.contentHash());
    }
    private String contextContent(String content) {
        return content.length() > 12000 ? content.substring(0,12000) : content;
    }
    private boolean visible(ResultSet row, ChatSourceSnapshot current) throws SQLException {
        return current.fingerprint().equals(row.getString("source_fingerprint")) && row.getString("canonical_result") != null;
    }
    private MessageResponse response(ResultSet row, ChatSourceSnapshot current) throws SQLException {
        boolean assistant = "ASSISTANT".equals(row.getString("role"));
        boolean redacted = assistant && !visible(row,current);
        QuestionResponse result = assistant && !redacted ? json.read(row.getString("canonical_result"),QuestionResponse.class) : null;
        return new MessageResponse(row.getObject("id",UUID.class),row.getObject("conversation_id",UUID.class),row.getString("role"),
                redacted ? REDACTED : row.getString("content"), redacted ? null : row.getString("intent"),
                redacted ? "SOURCE_UNAVAILABLE" : row.getString("refusal_code"),row.getString("provider_model"),
                row.getTimestamp("created_at").toInstant(),result == null ? List.of() : result.citations(),row.getLong("sequence_no"),
                redacted,result == null ? "STRICT" : result.knowledgeMode(),result == null ? List.of() : result.sections(),
                result == null ? null : result.operationId());
    }
    private QuestionResponse redactedResult(ChatOperation operation) {
        return new QuestionResponse(operation.resultMessageId(),operation.conversationId(),"REFUSE",REDACTED,"UNKNOWN","v1.0",List.of(),
                "SOURCE_UNAVAILABLE",operation.requestId(),null,null,null,operation.id(),operation.expanded()?"EXPANDED":"STRICT",List.of());
    }
}
