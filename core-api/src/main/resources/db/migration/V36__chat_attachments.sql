-- Files sent inside a conversation.
--
-- Deliberately not the same thing as a post attachment (V20): a file sent in a
-- chat is never registered in the workspace document library and never becomes
-- a retrieval source for the AI assistant. There is therefore no document_id
-- column here, and the kinds are IMAGE/FILE rather than IMAGE/DOCUMENT, so that
-- nobody reading this table later assumes the assistant can cite it.
--
-- Renumbered 30 -> 36 when main merged in. This script ran on the shared
-- development database as version 30 on 2026-10-09; main's Plan V2 work then
-- claimed 30 through 35 for its own files, and two files cannot hold one
-- version. Main's V30 and V31 could not move instead: they create tables
-- outright, so a fresh number would re-run them against objects that already
-- exist. This one was written to survive exactly that, as the note below says.
--
-- The consequence on the shared database is that version 36 now re-applies what
-- version 30 already did. IF NOT EXISTS is what makes that harmless: on a
-- database that already holds part of this, every statement below is a no-op.
-- Version 30 there still records this script under main's V30 filename, which
-- is a checksum mismatch that *:future does not cover and validate-on-migrate
-- currently does not enforce.
--
-- The original reason for a fresh number, kept because it recurs: version 29
-- was taken on the shared development database on 2026-10-04 by an "admin user
-- seed" migration from a working copy that was never committed.

-- A message may now carry only files, with no text. Blank text must be NULL
-- rather than an empty string, so a bug cannot produce an empty bubble.
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS chk_direct_messages_body;
ALTER TABLE direct_messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE direct_messages ADD CONSTRAINT chk_direct_messages_body
    CHECK (body IS NULL OR length(trim(body)) > 0);

CREATE TABLE IF NOT EXISTS chat_attachments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id    UUID NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
    kind          VARCHAR(16) NOT NULL CHECK (kind IN ('IMAGE', 'FILE')),
    storage_key   VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    media_type    VARCHAR(100) NOT NULL,
    byte_size     BIGINT NOT NULL CHECK (byte_size > 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attachments are always read by the message they belong to, one page of
-- messages at a time.
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message
    ON chat_attachments (message_id, created_at);

-- Defense in depth, following V6: Core API connects with a BYPASSRLS role, so
-- this only blocks direct PostgREST access if a Supabase key ever leaks.
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
-- Postgres has no CREATE POLICY IF NOT EXISTS, so the drop is what makes this
-- statement safe to run twice.
DROP POLICY IF EXISTS "deny_all" ON chat_attachments;
CREATE POLICY "deny_all" ON chat_attachments FOR ALL USING (false);
