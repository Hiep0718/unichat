-- AI replies keep their citations and stop borrowing a human identity
--
-- An @AI reply was attributed to whoever asked the question, so the thread
-- showed a student answering themselves, and the citations the AI Service
-- returned were thrown away — leaving an answer that looked grounded but
-- carried no way to check it.

-- 1. A system account the assistant posts as.
--    Locked, with a password hash no encoder can match, so it can never sign in.
INSERT INTO users (id, email, password_hash, system_role, status, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-0000000000a1',
    'assistant@unichat.system',
    '!no-login',
    'USER',
    'LOCKED',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Citations behind an AI reply, so a reader can open the source document.
ALTER TABLE discussion_replies
    ADD COLUMN IF NOT EXISTS citations JSONB NOT NULL DEFAULT '[]';

-- 3. Repoint existing AI replies at the system account. Their citations are
--    gone for good, but at least the authorship stops being wrong.
UPDATE discussion_replies
SET author_id = '00000000-0000-0000-0000-0000000000a1'
WHERE is_ai_answer = TRUE;
