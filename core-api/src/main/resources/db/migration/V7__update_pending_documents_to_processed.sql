-- Migration V7: Update legacy PENDING document statuses to PROCESSED
UPDATE documents
SET status = 'PROCESSED',
    updated_at = NOW()
WHERE status = 'PENDING';
