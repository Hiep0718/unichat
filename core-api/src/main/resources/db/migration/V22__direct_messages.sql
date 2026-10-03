-- Work Chat: one-to-one text messaging
--
-- The community feed is for questions a group should see. This is for the
-- exchange that does not belong on a board. Built from scratch: V9 dropped the
-- earlier channel-based chat tables entirely.

CREATE TABLE direct_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Participants are stored in a fixed order so that one pair of people has
    -- exactly one conversation, whichever of them opened it first. Without the
    -- ordering, (a,b) and (b,a) would be two rows and the unique index below
    -- would not prevent a duplicate thread.
    participant_low UUID NOT NULL REFERENCES users(id),
    participant_high UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Denormalised so the conversation list sorts without touching messages.
    last_message_at TIMESTAMPTZ,
    CONSTRAINT chk_direct_conversations_order CHECK (participant_low < participant_high),
    CONSTRAINT uq_direct_conversations_pair UNIQUE (participant_low, participant_high)
);

-- Listing someone's conversations hits both columns, so both are indexed.
CREATE INDEX idx_direct_conversations_low
    ON direct_conversations (participant_low, last_message_at DESC);
CREATE INDEX idx_direct_conversations_high
    ON direct_conversations (participant_high, last_message_at DESC);

CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Set when the other participant has seen it; null while unread.
    read_at TIMESTAMPTZ,
    CONSTRAINT chk_direct_messages_body CHECK (length(trim(body)) > 0)
);

-- Reading a conversation pages newest-first; counting unread filters on both.
CREATE INDEX idx_direct_messages_conversation
    ON direct_messages (conversation_id, created_at DESC);
CREATE INDEX idx_direct_messages_unread
    ON direct_messages (conversation_id, sender_id) WHERE read_at IS NULL;
