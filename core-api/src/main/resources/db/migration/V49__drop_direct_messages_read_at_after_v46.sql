-- V45 retired direct_messages.read_at for the third time: read state is the
-- per-participant watermark conversation_participants.last_read_at (ADR-023),
-- and DirectMessage maps no read_at column. V46 was written on another branch
-- against an entity that still mapped it, so it adds the column back; merging
-- the two leaves a chain that ends with a column nothing reads and a partial
-- index on it. V46 stays on the classpath because databases have already
-- applied it and Flyway refuses a history entry it cannot resolve, so the
-- column is dropped here instead. IF EXISTS keeps this safe either way.
ALTER TABLE public.direct_messages DROP COLUMN IF EXISTS read_at;
