-- Reddit Mechanics Schema Migration V9
-- Drops decommissioned community chat tables and adds vote scoring for discussions.

-- 1. Drop decommissioned chat tables
DROP TABLE IF EXISTS community_ai_responses;
DROP TABLE IF EXISTS community_messages;
DROP TABLE IF EXISTS community_channels;

-- 2. Add vote tracking to discussions
ALTER TABLE discussions ADD COLUMN vote_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE discussion_replies ADD COLUMN vote_score INTEGER NOT NULL DEFAULT 0;

-- 3. Indexes for Reddit-style feed sorting (HOT and NEW)
CREATE INDEX idx_discussions_hot ON discussions(workspace_id, vote_score DESC, created_at DESC);
CREATE INDEX idx_discussions_new ON discussions(workspace_id, created_at DESC);
