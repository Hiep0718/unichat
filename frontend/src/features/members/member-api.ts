/**
 * Member API client functions.
 * Communicates with Core API workspace member endpoints via fetchJson.
 *
 * @see api-contracts.md §3 (Workspace và thành viên)
 */
import { fetchJson } from '../../lib/api-client';

import type { InviteMemberInput, MemberDto, MemberRole } from './member-schema';

/**
 * Fetches active members of a workspace.
 * Requires OWNER role.
 *
 * @param workspaceId workspace identifier
 */
export function getMembers(workspaceId: string): Promise<MemberDto[]> {
  return fetchJson(`/workspaces/${workspaceId}/members`);
}

/**
 * Invites a new member to the workspace by email.
 * The invited user is auto-activated.
 *
 * @param workspaceId workspace identifier
 * @param data invite payload with email and role
 */
export function inviteMember(
  workspaceId: string,
  data: InviteMemberInput,
): Promise<MemberDto> {
  return fetchJson(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Changes the role of an existing workspace member.
 *
 * @param workspaceId workspace identifier
 * @param userId target member's user ID
 * @param role new role (EDITOR or VIEWER)
 */
export function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: MemberRole,
): Promise<MemberDto> {
  return fetchJson(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

/**
 * Removes a member from the workspace.
 *
 * @param workspaceId workspace identifier
 * @param userId target member's user ID
 */
export function removeMember(
  workspaceId: string,
  userId: string,
): Promise<void> {
  return fetchJson(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
  });
}
