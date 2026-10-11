-- Additive account/session metadata. Legacy access JWTs intentionally fail the new sid/revision checks.
ALTER TABLE users ADD COLUMN security_version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT chk_users_security_version CHECK (security_version >= 0);
-- Legacy LOCKED rows remain manual locks even when their old timeout has passed.
UPDATE users SET locked_until = NULL WHERE status = 'LOCKED';

CREATE TABLE refresh_families (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
INSERT INTO refresh_families(id,user_id,expires_at,revoked_at)
SELECT family_id,user_id,MIN(expires_at),MIN(revoked_at)
FROM refresh_tokens GROUP BY family_id,user_id;
CREATE INDEX idx_refresh_families_user ON refresh_families(user_id);
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_token_family
    FOREIGN KEY (family_id) REFERENCES refresh_families(id) ON DELETE CASCADE;
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens(user_id) WHERE revoked_at IS NULL;

ALTER TABLE password_reset_otps ALTER COLUMN otp_code DROP NOT NULL;
ALTER TABLE password_reset_otps ADD COLUMN challenge_id UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE password_reset_otps ADD COLUMN otp_hash VARCHAR(64);
ALTER TABLE password_reset_otps ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE password_reset_otps ADD COLUMN consumed_at TIMESTAMPTZ;
ALTER TABLE password_reset_otps ADD COLUMN purpose VARCHAR(30) NOT NULL DEFAULT 'PASSWORD_RESET'
    CHECK (purpose='PASSWORD_RESET');
ALTER TABLE password_reset_otps ADD CONSTRAINT chk_reset_attempts CHECK (attempts BETWEEN 0 AND 5);
-- Invalidate and erase legacy plaintext challenges, without inventing trusted hashes.
UPDATE password_reset_otps SET otp_code=NULL,expires_at=LEAST(expires_at,CURRENT_TIMESTAMP);

CREATE INDEX idx_audit_events_action_time ON audit_events(action,occurred_at DESC);
CREATE INDEX idx_audit_events_actor_time ON audit_events(actor_id,occurred_at DESC);
CREATE OR REPLACE FUNCTION protect_security_audit() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP='UPDATE' THEN RAISE EXCEPTION 'Security audit events are append-only'; END IF;
    IF OLD.occurred_at >= CURRENT_TIMESTAMP -
        COALESCE(NULLIF(current_setting('unichat.audit_retention_seconds',true),''),'15552000')::BIGINT * INTERVAL '1 second'
        THEN RAISE EXCEPTION 'Security audit retention window has not elapsed'; END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION protect_security_audit();

CREATE TABLE provider_attempts (
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
CREATE INDEX idx_provider_attempts_started ON provider_attempts(started_at);
CREATE INDEX idx_provider_attempts_operation ON provider_attempts(operation_id);
CREATE INDEX idx_provider_attempts_key_model_time ON provider_attempts(key_id,model,started_at);
CREATE TABLE security_telemetry_coverage (
    stream VARCHAR(40) PRIMARY KEY,
    collected_from TIMESTAMPTZ NOT NULL
);
INSERT INTO security_telemetry_coverage(stream,collected_from)
VALUES ('PROVIDER_ATTEMPTS',CURRENT_TIMESTAMP),('SECURITY_AUDIT',CURRENT_TIMESTAMP);
