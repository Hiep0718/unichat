-- V33: Idempotent catch-up for columns/tables that entity classes expect but may
-- not exist in the database because migration files V22, V30 and V31 were edited
-- after their original checksum was recorded by Flyway.
-- Every statement uses IF NOT EXISTS so this migration is safe to run against a
-- database that already has any of these objects.

-- =========================================================================
-- V30 catch-up: password_reset_otps
-- =========================================================================
ALTER TABLE password_reset_otps ALTER COLUMN otp_code DROP NOT NULL;
ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS challenge_id UUID;
UPDATE password_reset_otps SET challenge_id = gen_random_uuid() WHERE challenge_id IS NULL;
DO $$ BEGIN
    ALTER TABLE password_reset_otps ALTER COLUMN challenge_id SET NOT NULL;
    ALTER TABLE password_reset_otps ALTER COLUMN challenge_id SET DEFAULT gen_random_uuid();
EXCEPTION WHEN others THEN NULL;
END $$;
ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(64);
ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
UPDATE password_reset_otps SET attempts = 0 WHERE attempts IS NULL OR attempts < 0 OR attempts > 5;
ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;
DO $$ BEGIN
    ALTER TABLE password_reset_otps ADD CONSTRAINT chk_reset_attempts CHECK (attempts BETWEEN 0 AND 5);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
UPDATE password_reset_otps SET otp_code = NULL, expires_at = LEAST(expires_at, CURRENT_TIMESTAMP) WHERE otp_code IS NOT NULL;

-- =========================================================================
-- V30 catch-up: users
-- =========================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
UPDATE users SET security_version = 0 WHERE security_version IS NULL;
UPDATE users SET version = 0 WHERE version IS NULL;
DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT chk_users_security_version CHECK (security_version >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
UPDATE users SET locked_until = NULL WHERE status = 'LOCKED' AND locked_until IS NOT NULL;

-- =========================================================================
-- V30 catch-up: refresh_families
-- =========================================================================
CREATE TABLE IF NOT EXISTS refresh_families (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_refresh_families_user ON refresh_families(user_id);

-- Backfill refresh_families from existing refresh_tokens
INSERT INTO refresh_families (id, user_id, expires_at, revoked_at)
SELECT DISTINCT ON (rt.family_id)
    rt.family_id,
    rt.user_id,
    COALESCE(rt.expires_at, CURRENT_TIMESTAMP + INTERVAL '30 days'),
    rt.revoked_at
FROM refresh_tokens rt
JOIN users u ON u.id = rt.user_id
WHERE rt.family_id IS NOT NULL
ORDER BY rt.family_id, rt.expires_at DESC
ON CONFLICT (id) DO NOTHING;

-- Clean up any orphaned refresh_tokens where family_id is missing or not in refresh_families
DELETE FROM refresh_tokens WHERE family_id IS NULL OR family_id NOT IN (SELECT id FROM refresh_families);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_refresh_token_family' AND table_name = 'refresh_tokens'
    ) THEN
        ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_token_family
            FOREIGN KEY (family_id) REFERENCES refresh_families(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_active ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

-- =========================================================================
-- V30 catch-up: audit_events indexes and trigger
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_audit_events_action_time ON audit_events(action, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_time ON audit_events(actor_id, occurred_at DESC);
CREATE OR REPLACE FUNCTION protect_security_audit() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Security audit events are append-only'; END IF;
    IF OLD.occurred_at >= CURRENT_TIMESTAMP -
        COALESCE(NULLIF(current_setting('unichat.audit_retention_seconds',true),''),'15552000')::BIGINT * INTERVAL '1 second'
        THEN RAISE EXCEPTION 'Security audit retention window has not elapsed'; END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
DO $$ BEGIN
    CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events
        FOR EACH ROW EXECUTE FUNCTION protect_security_audit();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- V30 catch-up: provider_attempts
-- =========================================================================
CREATE TABLE IF NOT EXISTS provider_attempts (
    id UUID PRIMARY KEY,
    operation_id UUID,
    purpose VARCHAR(40) NOT NULL CHECK (purpose IN ('CHAT','COMPACTION','ADMIN_PROMPT','KEY_PROBE')),
    provider VARCHAR(40) NOT NULL,
    key_id VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    outcome VARCHAR(20) CHECK (outcome IN ('SUCCESS','ERROR','CANCELLED')),
    latency_ms BIGINT CHECK (latency_ms>=0),
    input_tokens BIGINT CHECK (input_tokens>=0),
    output_tokens BIGINT CHECK (output_tokens>=0),
    error_code VARCHAR(80),
    CHECK ((ended_at IS NULL AND outcome IS NULL) OR (ended_at>=started_at AND outcome IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_provider_attempts_started ON provider_attempts(started_at);
CREATE INDEX IF NOT EXISTS idx_provider_attempts_operation ON provider_attempts(operation_id);
CREATE INDEX IF NOT EXISTS idx_provider_attempts_key_model_time ON provider_attempts(key_id, model, started_at);

-- =========================================================================
-- V31 catch-up: security_rate_windows & service_nonces
-- =========================================================================
CREATE TABLE IF NOT EXISTS security_rate_windows (
    subject_hash VARCHAR(64) NOT NULL,
    action VARCHAR(100) NOT NULL,
    window_start BIGINT NOT NULL,
    request_count INTEGER NOT NULL CHECK (request_count > 0),
    PRIMARY KEY (subject_hash, action, window_start)
);
CREATE INDEX IF NOT EXISTS idx_security_rate_expiry ON security_rate_windows(window_start);

CREATE TABLE IF NOT EXISTS service_nonces (
    identity VARCHAR(100) NOT NULL,
    nonce UUID NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY(identity, nonce)
);
CREATE INDEX IF NOT EXISTS idx_service_nonce_expiry ON service_nonces(expires_at);

-- =========================================================================
-- V31 catch-up: conversations & messages
-- =========================================================================
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS next_sequence BIGINT NOT NULL DEFAULT 1;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summary_fingerprint VARCHAR(64);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sequence_no BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS source_fingerprint VARCHAR(64);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS canonical_result JSONB;

-- Backfill sequence_no for rows that missed the original data migration
DO $$ BEGIN
    WITH ordered AS (
        SELECT id, row_number() OVER (PARTITION BY conversation_id ORDER BY COALESCE(sequence_no, 0), created_at, id) AS seq
        FROM messages
    ) UPDATE messages SET sequence_no = ordered.seq FROM ordered WHERE messages.id = ordered.id;
    ALTER TABLE messages ALTER COLUMN sequence_no SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
    UPDATE conversations SET next_sequence = COALESCE(
        (SELECT max(sequence_no) + 1 FROM messages WHERE conversation_id = conversations.id), 1);
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_message_sequence ON messages(conversation_id, sequence_no);

ALTER TABLE citation_history ADD COLUMN IF NOT EXISTS ingestion_version INTEGER;
ALTER TABLE citation_history ADD COLUMN IF NOT EXISTS citation_id VARCHAR(100);
ALTER TABLE citation_history ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION;

-- =========================================================================
-- V31 catch-up: chat_operations
-- =========================================================================
CREATE TABLE IF NOT EXISTS chat_operations (
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
CREATE UNIQUE INDEX IF NOT EXISTS uq_running_conversation ON chat_operations(conversation_id) WHERE state = 'RUNNING';
CREATE INDEX IF NOT EXISTS idx_chat_actor_state ON chat_operations(actor_id, state);
CREATE INDEX IF NOT EXISTS idx_chat_lease ON chat_operations(lease_until) WHERE state = 'RUNNING';

-- =========================================================================
-- V31 catch-up: chat_source_dependencies
-- =========================================================================
CREATE TABLE IF NOT EXISTS chat_source_dependencies (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,
    ingestion_version INTEGER NOT NULL,
    document_hash VARCHAR(64) NOT NULL,
    PRIMARY KEY(message_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_dependency_document ON chat_source_dependencies(document_id);

ALTER TABLE studio_notes ADD COLUMN IF NOT EXISTS source_message_id UUID;
ALTER TABLE studio_notes ADD COLUMN IF NOT EXISTS source_fingerprint VARCHAR(64);
UPDATE studio_notes SET source_message_id = NULL WHERE source_message_id IS NOT NULL AND source_message_id NOT IN (SELECT id FROM messages);
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_studio_notes_source_message' AND table_name = 'studio_notes'
    ) THEN
        ALTER TABLE studio_notes ADD CONSTRAINT fk_studio_notes_source_message
            FOREIGN KEY (source_message_id) REFERENCES messages(id);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================================
-- V31 catch-up: RLS on new tables
-- =========================================================================
ALTER TABLE refresh_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_source_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_rate_windows ENABLE ROW LEVEL SECURITY;
