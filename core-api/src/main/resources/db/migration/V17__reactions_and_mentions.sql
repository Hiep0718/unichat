-- Reaction set and mentions
--
-- Up/down voting is replaced by a small set of positive reactions. Downvotes
-- are corrosive in a group where everyone knows each other, and at class scale
-- the numbers rank nothing. Legacy UPVOTE rows are folded into LIKE; any
-- remaining DOWNVOTE rows are dropped rather than migrated, since there is no
-- longer a negative reaction to map them onto.

DELETE FROM reactions WHERE reaction_type = 'DOWNVOTE';
UPDATE reactions SET reaction_type = 'LIKE' WHERE reaction_type IN ('UPVOTE', 'HELPFUL');

ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_type_check;
ALTER TABLE reactions ADD CONSTRAINT reactions_reaction_type_check
    CHECK (reaction_type IN ('LIKE', 'LOVE', 'INSIGHTFUL', 'CELEBRATE'));

-- Counting reactions per target is the hot path once cards show them.
CREATE INDEX IF NOT EXISTS idx_reactions_target
    ON reactions (target_type, target_id);

-- Vote score now counts reactions of any kind, so recompute it from the rows
-- that survived rather than leaving stale values behind.
UPDATE discussions d SET vote_score = COALESCE((
    SELECT count(*) FROM reactions r
    WHERE r.target_type = 'DISCUSSION' AND r.target_id = d.id
), 0);

UPDATE discussion_replies dr SET vote_score = COALESCE((
    SELECT count(*) FROM reactions r
    WHERE r.target_type = 'DISCUSSION_REPLY' AND r.target_id = dr.id
), 0);
