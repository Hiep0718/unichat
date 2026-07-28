/**
 * React Query hooks for workspace data fetching and mutations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createWorkspace, deleteWorkspace, getWorkspaces } from './workspace-api';

import type { CreateWorkspaceInput } from './workspace-schema';

/** Query key factory for workspace queries. */
const workspaceKeys = {
  all: ['workspaces'] as const,
  list: (page: number) => [...workspaceKeys.all, 'list', page] as const,
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
