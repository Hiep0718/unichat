ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS indexed_chunk_count INTEGER,
    ADD COLUMN IF NOT EXISTS indexed_character_count BIGINT,
    ADD COLUMN IF NOT EXISTS ingestion_completed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_documents_workspace_manifest
    ON documents(workspace_id, status, ingestion_completed_at);

ALTER TABLE chat_operations
    ADD COLUMN IF NOT EXISTS task_type VARCHAR(32) NOT NULL DEFAULT 'QUESTION';

ALTER TABLE chat_operations
    ADD CONSTRAINT chk_chat_operation_task_type
    CHECK (task_type IN ('QUESTION', 'WORKSPACE_SUMMARY'));

CREATE INDEX IF NOT EXISTS idx_chat_operations_active_summary
    ON chat_operations(actor_id, workspace_id, conversation_id, created_at DESC)
    WHERE task_type = 'WORKSPACE_SUMMARY' AND state = 'RUNNING';

ALTER TABLE provider_attempts
    DROP CONSTRAINT IF EXISTS provider_attempts_purpose_check;

ALTER TABLE provider_attempts
    ADD CONSTRAINT provider_attempts_purpose_check
    CHECK (purpose IN ('CHAT', 'COMPACTION', 'QUERY_PLAN', 'WORKSPACE_SUMMARY', 'ADMIN_PROMPT', 'KEY_PROBE'));

CREATE TABLE IF NOT EXISTS workspace_summary_jobs (
    operation_id UUID PRIMARY KEY REFERENCES chat_operations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_fingerprint VARCHAR(128) NOT NULL,
    config_hash VARCHAR(128) NOT NULL,
    stage VARCHAR(32) NOT NULL,
    documents_total INTEGER NOT NULL CHECK (documents_total >= 0),
    documents_completed INTEGER NOT NULL DEFAULT 0 CHECK (documents_completed >= 0),
    chunks_total BIGINT NOT NULL CHECK (chunks_total >= 0),
    chunks_processed BIGINT NOT NULL DEFAULT 0 CHECK (chunks_processed >= 0),
    provider_calls_completed INTEGER NOT NULL DEFAULT 0 CHECK (provider_calls_completed >= 0),
    delivery_attempts INTEGER NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
    lease_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_summary_documents (
    operation_id UUID NOT NULL REFERENCES workspace_summary_jobs(operation_id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ingestion_version INTEGER NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    expected_chunk_count INTEGER NOT NULL CHECK (expected_chunk_count > 0),
    processed_chunk_count INTEGER NOT NULL DEFAULT 0 CHECK (processed_chunk_count >= 0),
    summary_json JSONB,
    checkpoint_hash VARCHAR(64),
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (operation_id, document_id),
    CHECK (status IN ('PENDING', 'READING', 'SUMMARIZING', 'COMPLETED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS workspace_summaries (
    id UUID PRIMARY KEY,
    operation_id UUID NOT NULL UNIQUE REFERENCES workspace_summary_jobs(operation_id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_fingerprint VARCHAR(128) NOT NULL,
    config_hash VARCHAR(128) NOT NULL,
    overview TEXT NOT NULL,
    overview_chunk_ids JSONB NOT NULL,
    cross_document_insights JSONB NOT NULL,
    document_count INTEGER NOT NULL CHECK (document_count > 0),
    processed_chunk_count BIGINT NOT NULL CHECK (processed_chunk_count > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_summaries_workspace_created
    ON workspace_summaries(workspace_id, created_at DESC);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS workspace_summary_id UUID;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS fk_messages_workspace_summary;
ALTER TABLE messages ADD CONSTRAINT fk_messages_workspace_summary
    FOREIGN KEY (workspace_summary_id) REFERENCES workspace_summaries(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS workspace_summary_outbox (
    id UUID PRIMARY KEY,
    operation_id UUID NOT NULL UNIQUE REFERENCES workspace_summary_jobs(operation_id) ON DELETE CASCADE,
    request_id VARCHAR(100) NOT NULL,
    task_type VARCHAR(32) NOT NULL DEFAULT 'WORKSPACE_SUMMARY',
    source_fingerprint VARCHAR(128) NOT NULL,
    config_hash VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_workspace_summary_outbox_pending
    ON workspace_summary_outbox(created_at) WHERE published_at IS NULL;

ALTER TABLE workspace_summary_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_summary_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_summary_outbox ENABLE ROW LEVEL SECURITY;
