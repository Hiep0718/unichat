-- V23__enable_rls_defense_in_depth_v2.sql
-- Defense-in-depth: Enable RLS on all remaining public tables and revoke PostgREST access.
-- Resolves Supabase linter issue: rls_disabled_in_public

SET statement_timeout = 0;

-- ============================================================
-- Step 1: Enable RLS and create deny-all policy on all tables
-- currently lacking RLS in schema public.
-- Uses a dynamic PL/pgSQL block to guarantee idempotency and
-- complete coverage across any environment.
-- ============================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND rowsecurity = false
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "deny_all" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "deny_all" ON public.%I FOR ALL USING (false);', tbl);
    END LOOP;
END $$;

-- ============================================================
-- Step 2: Revoke all privileges from PostgREST roles on existing objects
-- ============================================================

-- Revoke from anon (public unauthenticated access via PostgREST)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon;

-- Revoke from authenticated (Supabase Auth authenticated access via PostgREST)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;
REVOKE USAGE ON SCHEMA public FROM authenticated;

-- Revoke from service_role (Supabase Dashboard / service API direct access)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM service_role;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM service_role;
REVOKE USAGE ON SCHEMA public FROM service_role;

-- ============================================================
-- Step 3: Alter default privileges so any future tables,
-- sequences, or routines created in schema public do NOT grant
-- access to PostgREST roles.
-- ============================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon, authenticated, service_role;
