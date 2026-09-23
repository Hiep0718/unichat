-- A picture, and a colour to fall back on
--
-- Avatars have always been a letter on a hue derived from the name. That keeps
-- working and stays the default: a member who uploads nothing still gets a
-- recognisable mark, and a photo is a choice rather than an expectation.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_storage_key VARCHAR(255);

-- One of a small set of names, not free-form hex: an arbitrary colour can be
-- unreadable behind white initials, and the set is what the UI offers.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_color VARCHAR(16);

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_avatar_color;
ALTER TABLE users ADD CONSTRAINT chk_users_avatar_color
    CHECK (avatar_color IS NULL OR avatar_color IN
        ('navy', 'teal', 'plum', 'moss', 'clay', 'slate'));
