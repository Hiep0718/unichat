ALTER TABLE provider_attempts
    DROP CONSTRAINT IF EXISTS provider_attempts_purpose_check;

ALTER TABLE provider_attempts
    ADD CONSTRAINT provider_attempts_purpose_check
    CHECK (purpose IN ('CHAT', 'COMPACTION', 'QUERY_PLAN', 'ADMIN_PROMPT', 'KEY_PROBE'));
