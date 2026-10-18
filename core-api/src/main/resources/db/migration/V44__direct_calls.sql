-- One-to-one calls in Work Chat.
--
-- Only the history of a call is stored. The SDP and ICE candidates that set it
-- up describe network addresses and codecs for a session that is dead the
-- moment it ends, so they are relayed and never written down. What is kept is
-- what a conversation needs to show afterwards: who called whom, when, for how
-- long, and how it ended.
CREATE TABLE calls (
    id              UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
    caller_id       UUID NOT NULL REFERENCES users(id),
    callee_id       UUID NOT NULL REFERENCES users(id),
    media           VARCHAR(10) NOT NULL CHECK (media IN ('AUDIO', 'VIDEO')),
    -- A closed state machine, unlike workspace topics (ADR-027), so the cost of
    -- a migration to change it is low and the value of the constraint is high.
    status          VARCHAR(20) NOT NULL
                    CHECK (status IN ('RINGING', 'ACTIVE', 'ENDED', 'DECLINED', 'MISSED', 'FAILED')),
    started_at      TIMESTAMPTZ NOT NULL,
    answered_at     TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    end_reason      VARCHAR(20),

    -- The timestamps are what a duration is computed from, and a duration
    -- computed from a null is a wrong number rather than a crash: it would be
    -- noticed late, in a history panel, long after the row was written.
    -- Each rule is stated on its own so a violation names the rule it broke.

    -- Ringing has not happened yet and is not over.
    CONSTRAINT calls_ringing_has_no_times CHECK (
        status <> 'RINGING' OR (answered_at IS NULL AND ended_at IS NULL)
    ),
    -- Talking means somebody picked up, and it is not over.
    CONSTRAINT calls_active_was_answered CHECK (
        status <> 'ACTIVE' OR (answered_at IS NOT NULL AND ended_at IS NULL)
    ),
    -- Hung up after talking: both times are known.
    CONSTRAINT calls_ended_was_answered CHECK (
        status <> 'ENDED' OR (answered_at IS NOT NULL AND ended_at IS NOT NULL)
    ),
    -- Refused or unanswered: nobody picked up, and it is over.
    CONSTRAINT calls_unanswered_outcomes CHECK (
        status NOT IN ('DECLINED', 'MISSED') OR (answered_at IS NULL AND ended_at IS NOT NULL)
    ),
    -- Failures can happen either side of the pickup, so only the end is known.
    CONSTRAINT calls_failed_is_over CHECK (
        status <> 'FAILED' OR ended_at IS NOT NULL
    )
);

-- The history panel of one conversation, newest first.
CREATE INDEX idx_calls_conversation ON calls (conversation_id, started_at DESC);

-- "Do I have a call in progress" is asked before every new call, by both
-- parties, so it is worth an index that only carries the live rows.
CREATE INDEX idx_calls_live_caller ON calls (caller_id) WHERE status IN ('RINGING', 'ACTIVE');
CREATE INDEX idx_calls_live_callee ON calls (callee_id) WHERE status IN ('RINGING', 'ACTIVE');

-- Missed-call badges on the conversation list.
CREATE INDEX idx_calls_missed ON calls (callee_id, started_at DESC) WHERE status = 'MISSED';
