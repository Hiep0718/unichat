-- Community Chat & Discussion Schema Migration V8
-- Extends workspace with channels, messages, discussions, and reactions.

-- 1. Community Channels
CREATE TABLE community_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'general',
    description VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- 2. Community Messages
CREATE TABLE community_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES community_channels(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    author_type VARCHAR(10) NOT NULL CHECK (author_type IN ('USER', 'AI')),
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES community_messages(id),
    mentions_ai BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_community_msg_channel ON community_messages(channel_id, created_at);

-- 3. AI Responses linked to messages and retrieval traces
CREATE TABLE community_ai_responses (
    message_id UUID PRIMARY KEY REFERENCES community_messages(id),
    retrieval_trace_id UUID,
    triggered_by_message_id UUID NOT NULL REFERENCES community_messages(id)
);

-- 4. Discussions
CREATE TABLE discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    label VARCHAR(20) CHECK (label IN ('QUESTION', 'DISCUSSION', 'ANNOUNCEMENT')),
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
    view_count INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_discussions_workspace ON discussions(workspace_id, pinned DESC, updated_at DESC);

-- 5. Discussion Replies
CREATE TABLE discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    parent_reply_id UUID REFERENCES discussion_replies(id),
    is_ai_answer BOOLEAN NOT NULL DEFAULT FALSE,
    retrieval_trace_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_replies_discussion ON discussion_replies(discussion_id, created_at);

-- 6. Reactions (Polymorphic)
CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    target_type VARCHAR(30) NOT NULL CHECK (target_type IN (
        'COMMUNITY_MESSAGE', 'DISCUSSION', 'DISCUSSION_REPLY', 'AI_ANSWER'
    )),
    target_id UUID NOT NULL,
    reaction_type VARCHAR(10) NOT NULL CHECK (reaction_type IN ('UPVOTE', 'DOWNVOTE', 'HELPFUL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, target_type, target_id)
);

-- 7. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED',
        'JOIN_REQUEST', 'JOIN_APPROVED',
        'DISCUSSION_REPLY', 'AI_MENTION_REPLY',
        'COMMUNITY_MENTION'
    )),
    workspace_id UUID REFERENCES workspaces(id),
    payload JSONB NOT NULL DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- 8. Seed Default General Channel for existing workspaces
INSERT INTO community_channels (workspace_id, name, description)
SELECT id, 'general', 'Kênh thảo luận chung' FROM workspaces;
