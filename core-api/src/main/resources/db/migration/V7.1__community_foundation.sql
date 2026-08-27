-- Community Foundation Schema Migration V7
-- Extends workspace, membership, and documents for community features.

-- 1. Extend workspaces with community fields
ALTER TABLE workspaces ADD COLUMN category VARCHAR(50);
ALTER TABLE workspaces ADD COLUMN join_policy VARCHAR(20)
    DEFAULT 'OPEN' CHECK (join_policy IN ('OPEN', 'REQUEST_APPROVAL'));
ALTER TABLE workspaces ADD COLUMN contribution_policy VARCHAR(20)
    DEFAULT 'APPROVAL_REQUIRED' CHECK (contribution_policy IN ('FREE', 'APPROVAL_REQUIRED'));
ALTER TABLE workspaces ADD COLUMN question_count INTEGER DEFAULT 0;

-- 2. Extend workspace_members: add CONTRIBUTOR role, PENDING_APPROVAL status
ALTER TABLE workspace_members DROP CONSTRAINT chk_workspace_members_role;
ALTER TABLE workspace_members ADD CONSTRAINT chk_workspace_members_role
    CHECK (role IN ('OWNER', 'EDITOR', 'CONTRIBUTOR', 'VIEWER'));

ALTER TABLE workspace_members DROP CONSTRAINT chk_workspace_members_status;
ALTER TABLE workspace_members ADD CONSTRAINT chk_workspace_members_status
    CHECK (status IN ('ACTIVE', 'REVOKED', 'PENDING_APPROVAL'));

-- 3. Extend documents: add contributor_id, expand status values
ALTER TABLE documents ADD COLUMN contributor_id UUID REFERENCES users(id);

ALTER TABLE documents DROP CONSTRAINT chk_documents_status;
ALTER TABLE documents ADD CONSTRAINT chk_documents_status
    CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DELETING',
                      'PENDING_REVIEW', 'PLATFORM_REJECTED', 'OWNER_REJECTED'));

-- 4. Category master table
CREATE TABLE workspace_categories (
    code VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 5. Document review history
CREATE TABLE document_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewer_type VARCHAR(20) NOT NULL CHECK (reviewer_type IN ('PLATFORM', 'OWNER', 'EDITOR')),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    reason TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_doc_reviews_document ON document_reviews(document_id, reviewed_at DESC);

-- 6. Seed default categories
INSERT INTO workspace_categories (code, display_name, icon, sort_order) VALUES
    ('MATHEMATICS', 'Toán học', '📐', 1),
    ('COMPUTER_SCIENCE', 'Khoa học máy tính', '💻', 2),
    ('PHYSICS', 'Vật lý', '⚛️', 3),
    ('CHEMISTRY', 'Hóa học', '🧪', 4),
    ('BIOLOGY', 'Sinh học', '🧬', 5),
    ('ECONOMICS', 'Kinh tế', '📊', 6),
    ('LITERATURE', 'Văn học', '📚', 7),
    ('ENGINEERING', 'Kỹ thuật', '⚙️', 8),
    ('MEDICINE', 'Y học', '🏥', 9),
    ('LAW', 'Luật', '⚖️', 10),
    ('OTHER', 'Khác', '📁', 99);
