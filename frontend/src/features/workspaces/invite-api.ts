/**
 * Invite-link API client.
 *
 * Mirrors `WorkspaceInviteController`. The preview call is the one request in
 * the product that works without a session: someone sent an invitation may not
 * have an account yet, and a login screen tells them nothing about what they
 * were invited to.
 */
import { fetchJson } from '../../lib/api-client';

import type { WorkspaceRole } from './workspace-schema';

export interface InviteDto {
  readonly id: string;
  /** Present only on creation; the server stores a hash and cannot show it again. */
  readonly token: string | null;
  readonly role: WorkspaceRole;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly maxUses: number;
  readonly usedCount: number;
  readonly active: boolean;
}

export interface InvitePreviewDto {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly invitedByName: string;
  readonly role: WorkspaceRole;
}

export interface CreateInviteInput {
  readonly role: WorkspaceRole;
  readonly expiresInDays: number;
  readonly maxUses: number;
}

/** Issues a link. The token in the result is the only copy that will exist. */
export function createInvite(workspaceId: string, input: CreateInviteInput): Promise<InviteDto> {
  return fetchJson(`/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** A workspace's links, newest first, without their tokens. */
export function getInvites(workspaceId: string): Promise<readonly InviteDto[]> {
  return fetchJson(`/workspaces/${workspaceId}/invites`);
}

/** Stops a link immediately. */
export function revokeInvite(workspaceId: string, inviteId: string): Promise<void> {
  return fetchJson(`/workspaces/${workspaceId}/invites/${inviteId}`, { method: 'DELETE' });
}

/** What a link leads to. Works signed out. */
export function previewInvite(token: string): Promise<InvitePreviewDto> {
  return fetchJson(`/invites/${encodeURIComponent(token)}`);
}

/** Joins the workspace the link names. Requires a session. */
export function acceptInvite(token: string): Promise<InvitePreviewDto> {
  return fetchJson(`/invites/${encodeURIComponent(token)}/accept`, { method: 'POST' });
}

/** The URL an owner copies. Absolute, because it is pasted outside the app. */
export function inviteUrlFor(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}
