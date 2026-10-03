-- AI summaries for document attachments
--
-- A post carrying a long PDF asks every reader to open it before they know
-- whether it is worth opening. Once the document reaches the library and is
-- ingested, the assistant summarises it from that document alone, so the
-- summary sits next to the file rather than in the comment thread.

ALTER TABLE post_attachments
    ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- NOT_APPLICABLE for images, which are display-only and never retrieved.
-- PENDING until ingestion finishes, which for a member's contribution also
-- means waiting for an owner to approve it.
ALTER TABLE post_attachments
    ADD COLUMN IF NOT EXISTS summary_state VARCHAR(16) NOT NULL DEFAULT 'PENDING';

ALTER TABLE post_attachments DROP CONSTRAINT IF EXISTS post_attachments_summary_state_check;
ALTER TABLE post_attachments ADD CONSTRAINT post_attachments_summary_state_check
    CHECK (summary_state IN ('NOT_APPLICABLE', 'PENDING', 'READY', 'UNAVAILABLE'));

-- Rows that predate this column: images can never have a summary.
UPDATE post_attachments SET summary_state = 'NOT_APPLICABLE' WHERE kind = 'IMAGE';

-- Finding the attachments behind a freshly ingested document is the one hot
-- lookup this feature adds.
CREATE INDEX IF NOT EXISTS idx_post_attachments_document
    ON post_attachments (document_id) WHERE document_id IS NOT NULL;
