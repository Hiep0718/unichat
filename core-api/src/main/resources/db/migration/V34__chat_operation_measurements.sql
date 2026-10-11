ALTER TABLE chat_operations ADD COLUMN IF NOT EXISTS first_token_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_chat_terminal_window ON chat_operations(terminal_at) WHERE terminal_at IS NOT NULL;
