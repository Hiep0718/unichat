-- V12__conversation_summary.sql
-- Adds summary and summary_version columns to conversations table
-- for short-term conversation memory compaction (ADR-021).

ALTER TABLE conversations
  ADD COLUMN summary TEXT,
  ADD COLUMN summary_version INTEGER NOT NULL DEFAULT 0;
