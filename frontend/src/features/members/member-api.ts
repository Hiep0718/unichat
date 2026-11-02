/**
 * Member API client functions.
 * Communicates with Core API workspace member endpoints via fetchJson.
 *
 * @see api-contracts.md §3 (Workspace và thành viên)
 */

import { fetchJson } from '../../lib/api-client';

import type { WorkspaceRole } from '../workspaces/workspace-schema';

export type { WorkspaceRole };
export type WorkspaceMemberStatus = 'ACTIVE' | 'REVOKED';

export interface WorkspaceMemberResponse {
  workspaceId: string;
  userId: string;
  email: string;
  /** Name to show and to derive a letter avatar from; null when unresolved. */
  displayName: string | null;
  /** Whether to fetch the member's picture or draw the letter avatar. */
  hasAvatar: boolean;
  /** Chosen letter-avatar colour, null to derive one from the name. */
  avatarColor: string | null;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  /** Who invited them; null for a membership nobody was invited into. */
  invitedById: string | null;
}

export interface AddWorkspaceMemberRequest {
  email: string;
  role: WorkspaceRole;
}

export interface UpdateWorkspaceMemberRequest {
  role: WorkspaceRole;
}

export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberResponse[]> {
  return fetchJson<WorkspaceMemberResponse[]>(`/workspaces/${workspaceId}/members`);
}

export async function addWorkspaceMember(
  workspaceId: string,
  data: AddWorkspaceMemberRequest
): Promise<WorkspaceMemberResponse> {
  return fetchJson<WorkspaceMemberResponse>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  data: UpdateWorkspaceMemberRequest
): Promise<WorkspaceMemberResponse> {
  return fetchJson<WorkspaceMemberResponse>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  return fetchJson<void>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export const getMembers = (workspaceId: string) => fetchWorkspaceMembers(workspaceId);
export const inviteMember = (workspaceId: string, data: { email: string; role: WorkspaceRole }) => addWorkspaceMember(workspaceId, data);
export const updateMemberRole = (workspaceId: string, userId: string, role: WorkspaceRole) => updateWorkspaceMemberRole(workspaceId, userId, { role });
export const removeMember = (workspaceId: string, userId: string) => removeWorkspaceMember(workspaceId, userId);
