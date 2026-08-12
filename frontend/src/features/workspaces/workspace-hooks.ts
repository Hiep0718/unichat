/**
 * React Query hooks for workspace data fetching and mutations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createWorkspace,
  deleteWorkspace,
  getCategories,
  getPublicWorkspaces,
  getWorkspace,
  getWorkspaces,
  joinWorkspace,
  leaveWorkspace,
  updateWorkspace,
} from './workspace-api';

import type { CreateWorkspaceInput, UpdateWorkspaceInput } from './workspace-schema';

/** Query key factory for workspace queries. */
const workspaceKeys = {
  all: ['workspaces'] as const,
  list: (page: number) => [...workspaceKeys.all, 'list', page] as const,
  detail: (id: string) => [...workspaceKeys.all, 'detail', id] as const,
  explore: (search: string, page: number) => [...workspaceKeys.all, 'explore', search, page] as const,
  categories: () => [...workspaceKeys.all, 'categories'] as const,
};

/** Fetches the paginated list of workspaces visible to the current user. */
export function useWorkspaces(page = 0) {
  return useQuery({
    queryKey: workspaceKeys.list(page),
    queryFn: () => getWorkspaces(page),
  });
}

/** Mutation to create a new workspace. */
export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceInput) => createWorkspace(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/** Mutation to delete a workspace. */
export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => deleteWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/** Fetches a single workspace by ID. */
export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => getWorkspace(workspaceId),
    enabled: !!workspaceId,
  });
}

/** Mutation to update workspace metadata. */
export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateWorkspaceInput) => updateWorkspace(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/** Fetches public workspaces the user has not yet joined. */
export function usePublicWorkspaces(search = '', page = 0) {
  return useQuery({
    queryKey: workspaceKeys.explore(search, page),
    queryFn: () => getPublicWorkspaces(page, 20, search || undefined),
  });
}

/** Fetches workspace categories for filtering. */
export function useCategories() {
  return useQuery({
    queryKey: workspaceKeys.categories(),
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });
}

/** Mutation to join a public workspace. */
export function useJoinWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => joinWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/** Mutation to leave a workspace. */
export function useLeaveWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => leaveWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}
