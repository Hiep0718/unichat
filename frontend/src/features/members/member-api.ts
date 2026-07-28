import { fetchJson } from '../../lib/api-client';

export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type WorkspaceMemberStatus = 'ACTIVE' | 'REVOKED';

export interface WorkspaceMemberResponse {
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  invitedById: string;
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
