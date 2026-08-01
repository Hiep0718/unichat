/**
 * React Query hooks for workspace data fetching and mutations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  getWorkspaces,
  updateWorkspace,
} from './workspace-api';

import type { CreateWorkspaceInput, UpdateWorkspaceInput } from './workspace-schema';

/** Query key factory for workspace queries. */
const workspaceKeys = {
  all: ['workspaces'] as const,
  list: (page: number) => [...workspaceKeys.all, 'list', page] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
};

/**
 * Fetches the paginated list of workspaces visible to the current user.
 */
export function useWorkspaces(page = 0) {
  return useQuery({
    queryKey: workspaceKeys.list(page),
    queryFn: () => getWorkspaces(page),
  });
}

/**
 * Mutation to create a new workspace.
 * Invalidates workspace list on success so UI refreshes automatically.
 */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceInput) => createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/**
 * Mutation to delete a workspace.
 * Invalidates workspace list on success so UI refreshes automatically.
 */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/**
 * Fetches a single workspace by ID.
 */
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => getWorkspace(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Mutation to update workspace metadata.
 * Invalidates both list and detail caches on success.
 */
export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWorkspaceInput) => updateWorkspace(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
