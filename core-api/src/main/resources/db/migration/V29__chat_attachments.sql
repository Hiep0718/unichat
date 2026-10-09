-- Files sent inside a conversation.
--
-- Deliberately not the same thing as a post attachment (V20): a file sent in a
-- chat is never registered in the workspace document library and never becomes
-- a retrieval source for the AI assistant. There is therefore no document_id
-- column here, and the kinds are IMAGE/FILE rather than IMAGE/DOCUMENT, so that
-- nobody reading this table later assumes the assistant can cite it.

-- A message may now carry only files, with no text. Blank text must be NULL
-- rather than an empty string, so a bug cannot produce an empty bubble.
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS chk_direct_messages_body;
ALTER TABLE direct_messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE direct_messages ADD CONSTRAINT chk_direct_messages_body
    CHECK (body IS NULL OR length(trim(body)) > 0);

CREATE TABLE chat_attachments (
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
CREATE INDEX idx_chat_attachments_message ON chat_attachments (message_id, created_at);

-- Defense in depth, following V6: Core API connects with a BYPASSRLS role, so
-- this only blocks direct PostgREST access if a Supabase key ever leaks.
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON chat_attachments FOR ALL USING (false);
