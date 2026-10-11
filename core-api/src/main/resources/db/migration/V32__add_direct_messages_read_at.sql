-- V32: Add missing read_at column to direct_messages table.
-- The original V22 migration was modified after it had already been applied
-- to the database, so the read_at column was never created. This migration
-- adds it idempotently.

ALTER TABLE direct_messages
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
