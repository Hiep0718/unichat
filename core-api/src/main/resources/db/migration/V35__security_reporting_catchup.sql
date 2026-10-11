-- Add fields introduced after V30/V31 were first applied without changing old checksums.
ALTER TABLE password_reset_otps ADD COLUMN IF NOT EXISTS purpose VARCHAR(40) NOT NULL DEFAULT 'PASSWORD_RESET';
CREATE TABLE IF NOT EXISTS security_telemetry_coverage (
    stream VARCHAR(40) PRIMARY KEY,
    collected_from TIMESTAMPTZ NOT NULL
);
INSERT INTO security_telemetry_coverage(stream,collected_from)
VALUES ('PROVIDER_ATTEMPTS',CURRENT_TIMESTAMP),('SECURITY_AUDIT',CURRENT_TIMESTAMP)
ON CONFLICT (stream) DO NOTHING;
