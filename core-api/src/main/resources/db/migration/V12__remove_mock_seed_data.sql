-- Remove mock seed data inserted by V10
-- Delete in correct FK dependency order to avoid constraint violations

-- 1. Notifications referencing mock workspace
DELETE FROM notifications
WHERE workspace_id = '33333333-3333-3333-3333-333333333333';

-- 2. Reactions on mock discussions/replies
DELETE FROM reactions
WHERE target_id IN (
    '44444444-4444-4444-4444-444444444441',
    '44444444-4444-4444-4444-444444444442',
    '55555555-5555-5555-5555-555555555551',
    '55555555-5555-5555-5555-555555555552'
);

-- 3. Replies on mock discussions
DELETE FROM discussion_replies WHERE id IN (
    '55555555-5555-5555-5555-555555555551',
    '55555555-5555-5555-5555-555555555552'
);

-- 4. Mock discussions
DELETE FROM discussions WHERE id IN (
    '44444444-4444-4444-4444-444444444441',
    '44444444-4444-4444-4444-444444444442'
);

-- 5. Workspace members
DELETE FROM workspace_members
WHERE workspace_id = '33333333-3333-3333-3333-333333333333';

-- 7. Mock workspace
DELETE FROM workspaces WHERE id = '33333333-3333-3333-3333-333333333333';

-- 8. Mock users
DELETE FROM users WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
);
