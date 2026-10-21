-- V38 re-added direct_messages.read_at as a drift repair, unaware that V37
-- (applied earlier in version order, but written after V38 on a separate
-- branch) had already retired it: read state moved to the per-participant
-- watermark conversation_participants.last_read_at (ADR-023), and
-- DirectMessage no longer maps a read_at column at all. Running V38 after
-- V37 resurrects the column on any database that applies both, so it is
-- dropped again here. IF EXISTS keeps this safe on a database where V38
-- never ran.
ALTER TABLE public.direct_messages DROP COLUMN IF EXISTS read_at;
