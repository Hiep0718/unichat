-- Feed Enhancements: Tags, Accepted Answer, Bookmarks, Full-text Search
-- Supports Reddit/StackOverflow-style features for the community feed.

-- 1. Add tags (JSONB array) to discussions
ALTER TABLE discussions
    ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]';

-- 2. Add accepted_reply_id to discussions (StackOverflow-style accepted answer)
ALTER TABLE discussions
    ADD COLUMN IF NOT EXISTS accepted_reply_id UUID REFERENCES discussion_replies(id);

-- 3. Bookmarks table (Reddit-style save post)
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, discussion_id)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id, created_at DESC);

-- 4. GIN index for tag containment queries (@> operator)
CREATE INDEX IF NOT EXISTS idx_discussions_tags ON discussions USING gin(tags);

-- 5. Full-text search index (simple config for Vietnamese compatibility)
CREATE INDEX IF NOT EXISTS idx_discussions_search
    ON discussions USING gin(to_tsvector('simple', title || ' ' || body));
