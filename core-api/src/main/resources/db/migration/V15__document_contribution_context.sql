-- Contribution context
-- A contributed document arrives with no explanation, which leaves the owner
-- deciding on a filename alone. These two fields carry what the document is
-- and why the workspace needs it, so approval becomes an informed decision.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS contribution_summary VARCHAR(500);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS contribution_reason VARCHAR(1000);
