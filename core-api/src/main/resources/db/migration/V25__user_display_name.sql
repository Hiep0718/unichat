-- A name a person chooses, separate from their email
--
-- Numbered 25, not 23: version 23 was taken on the shared development database
-- by a migration applied from another branch. With validate-on-migrate off,
-- Flyway trusts the version number alone, so a second V23 is skipped in
-- silence rather than refused.
--
-- Every name in the product was derived as split_part(email, '@', 1), so a
-- member's name was a piece of their email address shown to everyone in their
-- groups. Beyond looking unfinished, it leaks the local part of an address to
-- anyone who can see a post.
--
-- The mention handle deliberately stays on the email: it must be unique, which
-- the unique index on lower(email) already guarantees, while display names are
-- free text and two people may share one.

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(50);

-- Backfill to exactly what was displayed before, so nothing changes visually
-- until someone chooses a name.
UPDATE users
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL;

-- The assistant is not a person and has no one to choose its name.
UPDATE users
SET display_name = 'Trợ lý AI'
WHERE id = '00000000-0000-0000-0000-0000000000a1';

ALTER TABLE users ALTER COLUMN display_name SET NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_display_name;
ALTER TABLE users ADD CONSTRAINT chk_users_display_name
    CHECK (length(trim(display_name)) BETWEEN 1 AND 50);
