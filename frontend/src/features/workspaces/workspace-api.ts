import { fetchJson } from '../../lib/api-client';

export type WorkspaceVisibility = 'PRIVATE' | 'SHARED' | 'PUBLIC';
export type WorkspaceRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface WorkspaceResponse {
  id: string;
  name: string;
  description?: string;
  visibility: WorkspaceVisibility;
  ownerId: string;
  userRole?: WorkspaceRole;
  documentCount?: number;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateWorkspacePayload {
  name: string;
  description?: string;
  visibility: WorkspaceVisibility;
}

export interface UpdateWorkspacePayload {
  name?: string;
  description?: string;
  visibility?: WorkspaceVisibility;
}

export async function fetchWorkspaces(
  page = 0,
  size = 20
): Promise<PageResponse<WorkspaceResponse>> {
  return fetchJson<PageResponse<WorkspaceResponse>>(`/workspaces?page=${page}&size=${size}`);
}

export async function fetchWorkspace(workspaceId: string): Promise<WorkspaceResponse> {
  return fetchJson<WorkspaceResponse>(`/workspaces/${workspaceId}`);
}

export async function createWorkspace(
  payload: CreateWorkspacePayload
): Promise<WorkspaceResponse> {
  return fetchJson<WorkspaceResponse>('/workspaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateWorkspace(
  workspaceId: string,
  payload: UpdateWorkspacePayload
): Promise<WorkspaceResponse> {
  return fetchJson<WorkspaceResponse>(`/workspaces/${workspaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  return fetchJson<void>(`/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
}
