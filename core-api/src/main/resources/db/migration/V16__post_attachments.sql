-- Post attachments
-- A post can carry images and documents. A document attachment is also
-- registered as a workspace document so the group's AI assistant can read and
-- cite it; images are display-only and never become retrieval sources.

CREATE TABLE IF NOT EXISTS post_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    kind VARCHAR(16) NOT NULL CHECK (kind IN ('IMAGE', 'DOCUMENT')),
    storage_key VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    byte_size BIGINT NOT NULL,
    -- Set when the attachment also entered the workspace document library.
    document_id UUID REFERENCES documents(id),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_attachments_discussion
    ON post_attachments (discussion_id, created_at);

-- Track edits so the UI can mark a post as edited.
ALTER TABLE discussions ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Soft delete: a removed post stays for referential integrity but disappears
-- from every listing.
ALTER TABLE discussions DROP CONSTRAINT IF EXISTS discussions_status_check;
ALTER TABLE discussions ADD CONSTRAINT discussions_status_check
    CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED', 'DELETED'));
