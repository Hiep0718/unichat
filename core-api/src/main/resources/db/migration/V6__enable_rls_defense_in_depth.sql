-- V6__enable_rls_defense_in_depth.sql
-- Defense-in-depth: Enable RLS on all public tables and deny access
-- to Supabase PostgREST roles (anon, authenticated, service_role).
--
-- Core API connects via JDBC as a superuser/BYPASSRLS role,
-- so RLS policies do NOT affect Core API queries.
-- These policies exist solely to block any direct PostgREST access
-- if the Supabase API key is leaked or misconfigured.

SET statement_timeout = 0;

-- ============================================================
-- Step 1: Enable RLS on all business tables
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_trace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 2: Deny-all RLS policy on every table
-- Any non-superuser/non-BYPASSRLS role gets zero rows.
-- ============================================================

CREATE POLICY "deny_all" ON users FOR ALL USING (false);
CREATE POLICY "deny_all" ON refresh_tokens FOR ALL USING (false);
CREATE POLICY "deny_all" ON workspaces FOR ALL USING (false);
CREATE POLICY "deny_all" ON workspace_members FOR ALL USING (false);
CREATE POLICY "deny_all" ON documents FOR ALL USING (false);
CREATE POLICY "deny_all" ON conversations FOR ALL USING (false);
CREATE POLICY "deny_all" ON messages FOR ALL USING (false);
CREATE POLICY "deny_all" ON citation_history FOR ALL USING (false);
CREATE POLICY "deny_all" ON retrieval_traces FOR ALL USING (false);
CREATE POLICY "deny_all" ON retrieval_trace_items FOR ALL USING (false);
CREATE POLICY "deny_all" ON evaluation_cases FOR ALL USING (false);
CREATE POLICY "deny_all" ON evaluation_runs FOR ALL USING (false);
CREATE POLICY "deny_all" ON evaluation_results FOR ALL USING (false);
CREATE POLICY "deny_all" ON idempotency_records FOR ALL USING (false);
CREATE POLICY "deny_all" ON rate_limit_buckets FOR ALL USING (false);
CREATE POLICY "deny_all" ON audit_events FOR ALL USING (false);
CREATE POLICY "deny_all" ON password_reset_otps FOR ALL USING (false);

-- ============================================================
-- Step 3: Revoke all privileges from Supabase PostgREST roles
-- ============================================================

-- Revoke from anon (public unauthenticated access via PostgREST)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon;

-- Revoke from authenticated (Supabase Auth authenticated access via PostgREST)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE USAGE ON SCHEMA public FROM authenticated;

-- Revoke from service_role (Supabase Dashboard/API — user confirmed not in use)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_role;
REVOKE USAGE ON SCHEMA public FROM service_role;
