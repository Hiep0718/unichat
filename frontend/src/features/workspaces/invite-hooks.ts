/**
 * React Query hooks for a workspace's invite links.
 *
 * Shared by the invite dialog, which issues links, and the access settings,
 * which list and revoke them: both can be on screen at once, so issuing a link
 * must refresh the list without either component knowing about the other.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createInvite, getInvites, revokeInvite } from './invite-api';

import type { CreateInviteInput } from './invite-api';

/** Query key factory for invite queries. */
export const inviteKeys = {
  all: (workspaceId: string) => ['workspaces', workspaceId, 'invites'] as const,
};

/** Lists a workspace's links; `enabled` is false where links are not allowed. */
export function useInvites(workspaceId: string, enabled: boolean) {
  return useQuery({
    queryKey: inviteKeys.all(workspaceId),
    queryFn: () => getInvites(workspaceId),
    enabled: enabled && !!workspaceId,
  });
}

/** Issues a link. The token is only in this mutation's result. */
export function useCreateInvite(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInviteInput) => createInvite(workspaceId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inviteKeys.all(workspaceId) }),
  });
}

/** Stops a link immediately. */
export function useRevokeInvite(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(workspaceId, inviteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inviteKeys.all(workspaceId) }),
  });
}
