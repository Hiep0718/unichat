-- Read receipts for posts
--
-- An announcement is only useful if the person who wrote it can tell whether
-- it reached anyone. Recording who opened a post turns "I posted it" into "11
-- of 14 members have seen it", which is the question a lecturer actually asks.

CREATE TABLE IF NOT EXISTS post_reads (
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (discussion_id, user_id)
);

-- Counting readers of one post is the hot path.
CREATE INDEX IF NOT EXISTS idx_post_reads_discussion
    ON post_reads (discussion_id, read_at DESC);

-- Pinned posts sort to the top of a group; the column exists from V8 but was
-- never indexed alongside the ordering the listings use.
CREATE INDEX IF NOT EXISTS idx_discussions_workspace_pinned
    ON discussions (workspace_id, pinned DESC, created_at DESC)
    WHERE status <> 'DELETED';
