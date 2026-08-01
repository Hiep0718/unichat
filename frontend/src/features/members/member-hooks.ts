/**
 * React Query hooks for workspace member data fetching and mutations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
} from './member-api';

import type { InviteMemberInput, MemberRole } from './member-schema';

/** Query key factory for member queries. */
const memberKeys = {
  all: (workspaceId: string) => ['workspaces', workspaceId, 'members'] as const,
};

/**
 * Fetches the list of active members for a workspace.
 */
export function useMembers(workspaceId: string) {
  return useQuery({
    queryKey: memberKeys.all(workspaceId),
    queryFn: () => getMembers(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Mutation to invite a new member to the workspace.
 * Invalidates member list on success.
 */
export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteMemberInput) => inviteMember(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(workspaceId) });
    },
  });
}

/**
 * Mutation to update a workspace member's role.
 * Invalidates member list on success.
 */
export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: MemberRole }) =>
      updateMemberRole(workspaceId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(workspaceId) });
    },
  });
}

/**
 * Mutation to remove a member from the workspace.
 * Invalidates member list on success.
 */
export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(workspaceId) });
    },
  });
}
