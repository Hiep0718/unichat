-- A cover picture for a group
--
-- Cards for groups that have no picture are not left blank: the UI draws a
-- gradient derived from the group id, so every group is visually distinct
-- before anyone uploads anything. A cover is therefore a choice, the same way
-- an uploaded avatar is a choice over the letter avatar (see V24).
--
-- Only the storage key is kept here. The bytes live in object storage, as with
-- avatars and documents, so a row stays small enough to list cheaply.

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS cover_storage_key VARCHAR(255);
