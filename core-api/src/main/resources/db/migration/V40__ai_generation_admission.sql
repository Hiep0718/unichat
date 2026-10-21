-- Prepared admission singleton; operational application remains human-gated.
CREATE TABLE ai_generation_control (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    state VARCHAR(16) NOT NULL CHECK (state IN ('OPEN', 'DRAINING', 'VERIFYING')),
    version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES users(id)
);

INSERT INTO ai_generation_control(id, state) VALUES (1, 'OPEN');

ALTER TABLE ai_generation_control ENABLE ROW LEVEL SECURITY;
