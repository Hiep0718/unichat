-- A colour behind a short post
--
-- Stores which preset was chosen, not the colours themselves. The gradients
-- live in the frontend, so restyling the set never needs a migration and never
-- leaves rows holding colours that no longer exist in the design.
--
-- Null is the ordinary post, which is the overwhelming majority. A background
-- only applies to a short post with no attachments; the service enforces the
-- length and clears the key when a file is attached, because a wall of text or
-- a photo grid on a gradient is unreadable.

ALTER TABLE discussions ADD COLUMN IF NOT EXISTS background_key VARCHAR(24);
