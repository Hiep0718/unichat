-- A new version after V37 repairs schemas still missing read_at even though
-- V32 is recorded as applied, without changing existing migration history.
ALTER TABLE public.direct_messages
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
