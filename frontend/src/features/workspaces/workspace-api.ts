/**
 * Workspace API client functions.
 * Communicates with Core API workspace endpoints via fetchJson.
 */
import { fetchJson } from '../../lib/api-client';

import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  PagedResponse,
  WorkspaceDto,
} from './workspace-schema';

/**
 * Fetches paginated workspaces visible to the authenticated user.
 *
 * @param page zero-based page number
 * @param size items per page (max 100)
 */
export function getWorkspaces(
  page = 0,
  size = 20,
): Promise<PagedResponse<WorkspaceDto>> {
  return fetchJson(`/workspaces?page=${page}&size=${size}`);
}

/**
 * Creates a new workspace with the given data.
 * Sends an Idempotency-Key header to prevent duplicate creation.
 */
export function createWorkspace(
  data: CreateWorkspaceInput,
): Promise<WorkspaceDto> {
  const idempotencyKey = crypto.randomUUID();

  return fetchJson('/workspaces', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

/**
 * Fetches a single workspace by ID.
 * Public workspaces bypass ACL; private/shared require membership.
 *
 * @param workspaceId workspace identifier
 */
export function getWorkspace(workspaceId: string): Promise<WorkspaceDto> {
  return fetchJson(`/workspaces/${workspaceId}`);
}

/**
 * Updates workspace metadata.
 * Sends expectedVersion for optimistic locking.
 *
 * @param workspaceId workspace identifier
 * @param data partial update fields
 */
export function updateWorkspace(
  workspaceId: string,
  data: UpdateWorkspaceInput,
): Promise<WorkspaceDto> {
  return fetchJson(`/workspaces/${workspaceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Deletes a workspace by ID. Only the owner can perform this action.
 */
export function deleteWorkspace(workspaceId: string): Promise<void> {
  return fetchJson(`/workspaces/${workspaceId}`, {
    method: 'DELETE',
  });
}
