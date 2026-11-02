-- Group conversations.
--
-- V22 built one-to-one messaging with the pair of people stored on the
-- conversation row itself. A group has no pair, so membership moves into
-- conversation_participants and the two columns become NULL for a group.
--
-- The tables keep their "direct_" names although they now hold both kinds. The
-- rename was deliberately not done: this migration is additive plus one backfill,
-- and renaming two tables on a shared development database buys a better name at
-- the cost of every checked-out branch. See ADR-023.
--
-- Renumbered 31 -> 37 for the same reason as V36, which carries the full note:
-- main's Plan V2 work claimed 30 through 35, and this script had already run on
-- the shared development database as version 31. Every statement is idempotent,
-- so re-applying it there under a new number is a no-op.

ALTER TABLE direct_conversations
    ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'DIRECT',
    -- Named only for a group; a one-to-one thread is titled by the other person.
    ADD COLUMN IF NOT EXISTS title VARCHAR(120),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE direct_conversations DROP CONSTRAINT IF EXISTS chk_direct_conversations_kind;
ALTER TABLE direct_conversations ADD CONSTRAINT chk_direct_conversations_kind
    CHECK (kind IN ('DIRECT', 'GROUP'));

ALTER TABLE direct_conversations ALTER COLUMN participant_low DROP NOT NULL;
ALTER TABLE direct_conversations ALTER COLUMN participant_high DROP NOT NULL;

-- The old constraint assumed both columns were present. The replacement makes
-- each kind's shape a database rule rather than a convention: a DIRECT row
-- always has its ordered pair and no title, a GROUP row always has a title and
-- neither participant column.
ALTER TABLE direct_conversations DROP CONSTRAINT IF EXISTS chk_direct_conversations_order;
ALTER TABLE direct_conversations DROP CONSTRAINT IF EXISTS chk_direct_conversations_shape;
ALTER TABLE direct_conversations ADD CONSTRAINT chk_direct_conversations_shape CHECK (
    (kind = 'DIRECT'
        AND participant_low IS NOT NULL
        AND participant_high IS NOT NULL
        AND participant_low < participant_high
        AND title IS NULL)
 OR (kind = 'GROUP'
        AND participant_low IS NULL
        AND participant_high IS NULL
        AND title IS NOT NULL)
);

-- uq_direct_conversations_pair stays as it is: Postgres does not treat two NULLs
-- as equal, so any number of groups coexist while two people still cannot end up
-- with a second one-to-one thread.

CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    role            VARCHAR(16) NOT NULL CHECK (role IN ('OWNER', 'MEMBER')),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A read watermark rather than a flag per message: with several people in a
    -- conversation, "read" is a fact about each of them, not about the message.
    last_read_at    TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);

-- Listing someone's conversations starts from their participant rows.
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
    ON conversation_participants (user_id);

-- Every existing one-to-one thread gets participant rows, so that one code path
-- serves both kinds from here on.
INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at)
SELECT id, participant_low, 'MEMBER', created_at
FROM direct_conversations
WHERE kind = 'DIRECT' AND participant_low IS NOT NULL
UNION ALL
SELECT id, participant_high, 'MEMBER', created_at
FROM direct_conversations
WHERE kind = 'DIRECT' AND participant_high IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Carries the existing read state over before the old column goes: each person's
-- watermark is the newest message of theirs that the other had already read.
--
-- Guarded on the column still existing, because this file has to survive being
-- run against a database where the drop below has already happened — a bare
-- UPDATE would fail to parse, not merely do nothing. Only untouched watermarks
-- are filled, so a re-run cannot move one that the application has since set.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'direct_messages' AND column_name = 'read_at'
    ) THEN
        UPDATE conversation_participants p
        SET last_read_at = (
            SELECT MAX(m.read_at)
            FROM direct_messages m
            WHERE m.conversation_id = p.conversation_id
              AND m.sender_id <> p.user_id
              AND m.read_at IS NOT NULL
        )
        WHERE p.last_read_at IS NULL;
    END IF;
END $$;

-- Dropped only after the backfill above. Keeping it would leave two sources of
-- truth for the same fact, and the one nothing writes is the one something reads.
DROP INDEX IF EXISTS idx_direct_messages_unread;
ALTER TABLE direct_messages DROP COLUMN IF EXISTS read_at;

-- Counting unread messages now compares against a watermark.
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_time
    ON direct_messages (conversation_id, sender_id, created_at);

-- Defense in depth, following V6.
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
-- Postgres has no CREATE POLICY IF NOT EXISTS, so the drop is what makes this
-- statement safe to run twice.
DROP POLICY IF EXISTS "deny_all" ON conversation_participants;
CREATE POLICY "deny_all" ON conversation_participants FOR ALL USING (false);
