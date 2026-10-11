CREATE TABLE security_rate_windows (
    subject_hash VARCHAR(64) NOT NULL,
    action VARCHAR(100) NOT NULL,
    window_start BIGINT NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0),
    PRIMARY KEY (subject_hash, action, window_start)
);
CREATE INDEX idx_security_rate_expiry ON security_rate_windows(window_start);

CREATE TABLE service_nonces (
    identity VARCHAR(100) NOT NULL,
    nonce UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(identity, nonce)
);
CREATE INDEX idx_service_nonce_expiry ON service_nonces(expires_at);

ALTER TABLE conversations ADD COLUMN next_sequence BIGINT NOT NULL DEFAULT 1;
ALTER TABLE conversations ADD COLUMN summary_fingerprint VARCHAR(64);
ALTER TABLE messages ADD COLUMN sequence_no BIGINT;
ALTER TABLE messages ADD COLUMN source_fingerprint VARCHAR(64);
ALTER TABLE messages ADD COLUMN canonical_result JSONB;
WITH ordered AS (
    SELECT id, row_number() OVER (PARTITION BY conversation_id ORDER BY created_at, id) AS sequence_no
    FROM messages
) UPDATE messages SET sequence_no = ordered.sequence_no FROM ordered WHERE messages.id = ordered.id;
ALTER TABLE messages ALTER COLUMN sequence_no SET NOT NULL;
UPDATE conversations SET next_sequence = COALESCE(
    (SELECT max(sequence_no) + 1 FROM messages WHERE conversation_id = conversations.id), 1);
CREATE UNIQUE INDEX uq_message_sequence ON messages(conversation_id, sequence_no);
ALTER TABLE citation_history ADD COLUMN ingestion_version INTEGER;
ALTER TABLE citation_history ADD COLUMN citation_id VARCHAR(100);
ALTER TABLE citation_history ADD COLUMN score DOUBLE PRECISION;

CREATE TABLE chat_operations (
    id UUID PRIMARY KEY,
    actor_id UUID NOT NULL REFERENCES users(id),
    operation_name VARCHAR(30) NOT NULL DEFAULT 'chat.ask',
    idempotency_key UUID NOT NULL,
    binding_hash VARCHAR(64) NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    original_conversation_id UUID,
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    user_message_id UUID NOT NULL REFERENCES messages(id),
    result_message_id UUID REFERENCES messages(id),
    question TEXT NOT NULL,
    expanded BOOLEAN NOT NULL,
    session_id UUID NOT NULL,
    security_version BIGINT NOT NULL,
    request_id VARCHAR(255) NOT NULL,
    state VARCHAR(20) NOT NULL CHECK(state IN ('RUNNING','COMPLETED','FAILED','CANCELLED')),
    source_fingerprint VARCHAR(64) NOT NULL,
    source_snapshot JSONB NOT NULL,
    error_code VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL,
    deadline_at TIMESTAMPTZ NOT NULL,
    lease_until TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    terminal_at TIMESTAMPTZ,
    CONSTRAINT uq_chat_actor_key UNIQUE(actor_id, operation_name, idempotency_key)
);
CREATE UNIQUE INDEX uq_running_conversation ON chat_operations(conversation_id) WHERE state = 'RUNNING';
CREATE INDEX idx_chat_actor_state ON chat_operations(actor_id, state);
CREATE INDEX idx_chat_lease ON chat_operations(lease_until) WHERE state = 'RUNNING';

CREATE TABLE chat_source_dependencies (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,
    ingestion_version INTEGER NOT NULL,
    document_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY(message_id, document_id)
);
CREATE INDEX idx_chat_dependency_document ON chat_source_dependencies(document_id);
ALTER TABLE studio_notes ADD COLUMN source_message_id UUID REFERENCES messages(id);
ALTER TABLE studio_notes ADD COLUMN source_fingerprint VARCHAR(64);

ALTER TABLE chat_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_source_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_rate_windows ENABLE ROW LEVEL SECURITY;
