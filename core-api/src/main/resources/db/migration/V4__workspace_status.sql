-- Add status column to workspaces for soft delete
ALTER TABLE workspaces 
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Update existing workspaces
UPDATE workspaces SET status = 'ACTIVE';
