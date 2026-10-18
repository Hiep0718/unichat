-- Invite links for SHARED workspaces.
--
-- Until now the only way into a group was an owner typing an email address,
-- which fails outright when the person has no account yet: addMember looks the
-- address up and refuses what it cannot find. So a group could not invite
-- anybody who was not already a user, and the person had to register first and
-- report back before they could be added. A link closes that gap, and it is
-- also the only form of invitation that travels outside the product, where
-- Work Chat cannot reach — Work Chat only reaches people who already share a
-- workspace with you, which is exactly the set who need no invitation.
--
-- The raw token is NEVER stored. Only its SHA-256 lives here, for the reason
-- refresh tokens are held the same way: a dump of this table must not yield a
-- set of working invitations. The raw value is returned once, at creation.
--
-- role is capped at VIEWER or EDITOR by a CHECK rather than by the service
-- alone. A link that could confer OWNER would let whoever forwarded it hand
-- away the group.
--
-- Uses are counted at acceptance, not at preview: the preview endpoint is
-- public, and chat clients fetch link previews automatically, so counting
-- there would let a Zalo or Teams unfurl bot burn the invitation before the
-- person it was sent to ever opened it.
--
-- Numbered 41, after 40 was taken. The fifth time an uncommitted migration has
-- claimed a number this tree wanted, after 29, then 32 and 33, then 38: version
-- 40 was applied to the shared development database on 2026-10-12 by "ai
-- generation admission", a script in no git ref. Flyway matches history by
-- version, so it counted this file as already applied and skipped it without a
-- word; the failure surfaced one layer later as Hibernate reporting the table
-- missing. Choosing the number by reading the migration directory is not enough
-- — the directory is not where the numbers are claimed.
--
-- Idempotent for the reason V36 records, which is also what makes a fresh
-- number safe: on a database that already holds this, the statement is a no-op.
CREATE TABLE IF NOT EXISTS workspace_invites (
    id               UUID         PRIMARY KEY,
    workspace_id     UUID         NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    token_hash       VARCHAR(64)  NOT NULL,
    role             VARCHAR(16)  NOT NULL,
    created_by_id    UUID         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL,
    expires_at       TIMESTAMPTZ  NOT NULL,
    max_uses         INTEGER      NOT NULL,
    used_count       INTEGER      NOT NULL DEFAULT 0,
    revoked_at       TIMESTAMPTZ,
    CONSTRAINT workspace_invites_token_hash_key UNIQUE (token_hash),
    CONSTRAINT workspace_invites_role_check CHECK (role IN ('VIEWER', 'EDITOR')),
    CONSTRAINT workspace_invites_max_uses_check CHECK (max_uses >= 1),
    CONSTRAINT workspace_invites_used_count_check CHECK (used_count >= 0)
);

-- Redeeming a link looks the row up by hash alone, which the unique constraint
-- already indexes. This one serves the owner's list of a group's live links.
CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace
    ON workspace_invites (workspace_id, created_at DESC);
