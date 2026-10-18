-- The reaction set becomes the one people already know from Facebook.
--
-- This reverses part of V17, which removed downvoting and left four reactions
-- that were all positive, on the grounds that a negative reaction in a group
-- where everyone knows each other carries a social cost. SAD and ANGRY bring
-- that cost back. The trade was made deliberately and is recorded in ADR-026:
-- a set people recognise without being taught beat a set that had to be
-- explained, and the product owner judged the risk acceptable at team scale.
--
-- INSIGHTFUL and CELEBRATE have no Facebook equivalent, so they are mapped
-- rather than deleted: WOW is the nearest reading of "sâu sắc" (surprise at
-- something you did not know), and CARE of "chúc mừng" (warmth toward the
-- person). Five rows existed at the time of writing, so nothing is lost at
-- scale; the mapping matters because deleting reactions would silently change
-- counts under posts people are still reading.
--
-- Numbered 42. Version 41 is this tree's workspace_invites, already applied;
-- 40 belongs to another branch. Confirmed against flyway_schema_history on the
-- shared database rather than by reading the migration directory, which is the
-- mistake that cost a failed startup on 2026-10-16.

-- Dropped before any row is rewritten, so the UPDATE below cannot be rejected
-- by the constraint it is moving away from. Same ordering as V17.
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;

UPDATE reactions SET reaction_type = 'WOW'  WHERE reaction_type = 'INSIGHTFUL';
UPDATE reactions SET reaction_type = 'CARE' WHERE reaction_type = 'CELEBRATE';

ALTER TABLE reactions ADD CONSTRAINT reactions_reaction_type_check
    CHECK (reaction_type IN ('LIKE', 'LOVE', 'CARE', 'HAHA', 'WOW', 'SAD', 'ANGRY'));
