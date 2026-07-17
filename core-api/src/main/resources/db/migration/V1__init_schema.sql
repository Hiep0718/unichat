-- UniChat Initial Schema Migration V1

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    system_role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    failed_login_count INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_system_role CHECK (system_role IN ('USER', 'ADMIN')),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'LOCKED'))
);
CREATE UNIQUE INDEX idx_users_email_lower ON users (lower(email));

-- 2. Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    replaced_by_id UUID REFERENCES refresh_tokens(id) ON DELETE SET NULL
);

-- 3. Workspaces Table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    visibility VARCHAR(50) NOT NULL,
    cloud_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    permission_version BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_workspaces_name_len CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
    CONSTRAINT chk_workspaces_visibility CHECK (visibility IN ('PRIVATE', 'SHARED', 'PUBLIC'))
);

-- 4. Workspace Members Table
CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    invited_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (workspace_id, user_id),
    CONSTRAINT chk_workspace_members_role CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
    CONSTRAINT chk_workspace_members_status CHECK (status IN ('ACTIVE', 'REVOKED'))
);
CREATE INDEX idx_workspace_members_user_status_workspace ON workspace_members (user_id, status, workspace_id);

-- 5. Documents Table
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    status VARCHAR(50) NOT NULL,
    ingestion_version INT NOT NULL DEFAULT 0,
    page_or_block_count INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_documents_status CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DELETING'))
);
CREATE INDEX idx_documents_workspace_status_created ON documents (workspace_id, status, created_at DESC);

-- 6. Resource Jobs Table
CREATE TABLE resource_jobs (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lease_owner VARCHAR(255),
    lease_expires_at TIMESTAMPTZ,
    idempotency_key VARCHAR(255),
    last_error_code VARCHAR(100),
    CONSTRAINT chk_resource_jobs_type CHECK (job_type IN ('INGEST', 'DELETE')),
    CONSTRAINT chk_resource_jobs_status CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'))
);
CREATE INDEX idx_resource_jobs_status_available_lease ON resource_jobs (status, available_at, lease_expires_at);

-- 7. Conversations Table
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_conversations_user_workspace_updated ON conversations (user_id, workspace_id, updated_at DESC);

-- 8. Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    intent VARCHAR(100),
    refusal_code VARCHAR(50),
    provider_model VARCHAR(100),
    prompt_version VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_messages_role CHECK (role IN ('USER', 'ASSISTANT'))
);
CREATE INDEX idx_messages_conversation_created_id ON messages (conversation_id, created_at, id);

-- 9. Citation History Table
CREATE TABLE citation_history (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    locator_type VARCHAR(50) NOT NULL,
    locator_value VARCHAR(255) NOT NULL,
    excerpt TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    ordinal INT NOT NULL,
    redacted_at TIMESTAMPTZ,
    CONSTRAINT uq_citation_msg_ord UNIQUE (message_id, ordinal)
);

-- 10. Retrieval Traces Table
CREATE TABLE retrieval_traces (
    id UUID PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    request_id VARCHAR(255) NOT NULL UNIQUE,
    strategy_version VARCHAR(50) NOT NULL,
    rule_id VARCHAR(100),
    intent VARCHAR(100),
    confidence DECIMAL(5,2),
    evidence_score DECIMAL(5,2),
    decision VARCHAR(50) NOT NULL,
    provider VARCHAR(100),
    latency_ms INT,
    prompt_tokens INT,
    config_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_retrieval_traces_decision CHECK (decision IN ('ANSWER', 'CLARIFY', 'REFUSE'))
);
CREATE INDEX idx_retrieval_traces_strategy_intent_created ON retrieval_traces (strategy_version, intent, created_at);

-- 11. Retrieval Trace Items Table
CREATE TABLE retrieval_trace_items (
    id UUID PRIMARY KEY,
    trace_id UUID NOT NULL REFERENCES retrieval_traces(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id VARCHAR(255) NOT NULL,
    rank INT NOT NULL,
    similarity DECIMAL(5,4) NOT NULL,
    source_group VARCHAR(100),
    locator_value VARCHAR(255),
    content_hash VARCHAR(64),
    CONSTRAINT uq_trace_rank UNIQUE (trace_id, rank)
);

-- 12. Evaluation Cases Table
CREATE TABLE evaluation_cases (
    id UUID PRIMARY KEY,
    dataset_version VARCHAR(50) NOT NULL,
    split VARCHAR(50) NOT NULL,
    intent VARCHAR(100),
    question TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    expected_document_id UUID,
    expected_locator VARCHAR(255),
    expected_answer_notes TEXT,
    evidence_label VARCHAR(100),
    topic_group VARCHAR(100),
    CONSTRAINT chk_evaluation_cases_split CHECK (split IN ('DEVELOPMENT', 'HOLDOUT'))
);
CREATE INDEX idx_evaluation_cases_dataset_split_intent_topic ON evaluation_cases (dataset_version, split, intent, topic_group);

-- 13. Evaluation Runs Table
CREATE TABLE evaluation_runs (
    id UUID PRIMARY KEY,
    dataset_version VARCHAR(50) NOT NULL,
    corpus_snapshot VARCHAR(255) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    provider_model VARCHAR(100) NOT NULL,
    embedding_revision VARCHAR(100) NOT NULL,
    strategy_version VARCHAR(50) NOT NULL,
    prompt_version VARCHAR(50) NOT NULL,
    config_hash VARCHAR(64) NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMPTZ,
    CONSTRAINT chk_evaluation_runs_branch CHECK (branch IN ('BASELINE', 'ADAPTIVE'))
);

-- 14. Evaluation Results Table
CREATE TABLE evaluation_results (
    id UUID PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES evaluation_runs(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES evaluation_cases(id) ON DELETE CASCADE,
    predicted_intent VARCHAR(100),
    decision VARCHAR(50),
    source_hit BOOLEAN,
    reciprocal_rank DECIMAL(5,4),
    citation_correct BOOLEAN,
    locator_correct BOOLEAN,
    claim_support DECIMAL(5,4),
    answer_score DECIMAL(5,2),
    latency_ms INT,
    prompt_tokens INT,
    notes TEXT,
    CONSTRAINT uq_run_case UNIQUE (run_id, case_id)
);

-- 15. Idempotency Records Table
CREATE TABLE idempotency_records (
    actor_id VARCHAR(255) NOT NULL,
    route_key VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT NOT NULL,
    response_body TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (actor_id, route_key, idempotency_key)
);

-- 16. Rate Limit Buckets Table
CREATE TABLE rate_limit_buckets (
    subject_key VARCHAR(255) NOT NULL,
    action_key VARCHAR(255) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (subject_key, action_key, window_start)
);

-- 17. Audit Events Table
CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_id VARCHAR(255),
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id UUID,
    workspace_id UUID,
    outcome VARCHAR(50) NOT NULL,
    metadata JSONB
);
CREATE INDEX idx_audit_events_workspace_occurred ON audit_events (workspace_id, occurred_at DESC);
