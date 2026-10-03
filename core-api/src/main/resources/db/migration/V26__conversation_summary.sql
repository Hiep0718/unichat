-- Conversation summary columns for short-term memory compaction (ADR-021).
--
-- Numbered 26, and idempotent, for one reason: an earlier copy of this file
-- was applied to the shared development database as version 16 from a working
-- copy that was never committed, then committed on main as version 12. So
-- neither 12 nor 16 can be used — 12 is taken by V12__remove_mock_seed_data,
-- and no revision in git matches the checksum recorded for 16.
--
-- IF NOT EXISTS is what makes a fresh number safe: on a database that already
-- has these columns this run is a no-op, and on a fresh one it creates them.
-- The orphaned version 16 row is ignored by "*:missing".

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS summary_version INTEGER NOT NULL DEFAULT 0;
