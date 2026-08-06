/**
 * React Query hooks for workspace data fetching and mutations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createWorkspace,
  deleteWorkspace,
  getPublicWorkspaces,
  getWorkspace,
  getWorkspaces,
  joinWorkspace,
  updateWorkspace,
} from './workspace-api';

import type { CreateWorkspaceInput, UpdateWorkspaceInput } from './workspace-schema';

/** Query key factory for workspace queries. */
const workspaceKeys = {
  all: ['workspaces'] as const,
  list: (page: number) => [...workspaceKeys.all, 'list', page] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
  explore: (search: string, page: number) => [...workspaceKeys.all, 'explore', search, page] as const,
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

/**
 * Fetches public workspaces the user has not yet joined.
 */
export function usePublicWorkspaces(search = '', page = 0) {
  return useQuery({
    queryKey: workspaceKeys.explore(search, page),
    queryFn: () => getPublicWorkspaces(page, 20, search || undefined),
  });
}

/**
 * Mutation to join a public workspace as VIEWER.
 * Invalidates both explore and workspace list caches on success.
 */
export function useJoinWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => joinWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
