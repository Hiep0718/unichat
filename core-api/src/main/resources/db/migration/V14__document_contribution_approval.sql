-- Document Contribution & Approval
-- Lets workspace members (VIEWER) contribute documents that stay invisible to
-- retrieval until an OWNER or EDITOR approves them.
--
-- Safety property: findAllowedDocumentIdsForWorkspaces already filters on
-- status = 'PROCESSED', so a PENDING_APPROVAL or REJECTED document can never
-- reach the AI Service. No change to the retrieval pipeline is required.

-- 1. Allow the two new lifecycle states
ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_documents_status;
ALTER TABLE documents ADD CONSTRAINT chk_documents_status
    CHECK (status IN (
        'PENDING_APPROVAL',
        'REJECTED',
        'PENDING',
        'PROCESSING',
        'PROCESSED',
        'FAILED',
        'DELETING'
    ));

-- 2. Contribution and moderation trail
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

-- 3. Approval queue lookup per workspace
CREATE INDEX IF NOT EXISTS idx_documents_pending_approval
    ON documents (workspace_id, created_at DESC)
    WHERE status = 'PENDING_APPROVAL';
