/**
 * React Query hooks for document data fetching and mutations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveDocument,
  deleteDocument,
  fetchPendingApprovalCount,
  fetchPendingApprovals,
  getDocuments,
  rejectDocument,
} from './document-api';

/** Query key factory for document queries. */
const documentKeys = {
  all: ['documents'] as const,
  list: (workspaceId: string) =>
    [...documentKeys.all, 'list', workspaceId] as const,
  pending: (workspaceId: string) =>
    [...documentKeys.all, 'pending', workspaceId] as const,
  pendingCount: (workspaceId: string) =>
    [...documentKeys.all, 'pending-count', workspaceId] as const,
};

/**
 * Fetches the list of documents for a given workspace.
 */
export function useDocuments(workspaceId: string) {
  return useQuery({
    queryKey: documentKeys.list(workspaceId),
    queryFn: () => getDocuments(workspaceId),
    enabled: !!workspaceId,
  });
}

/**
 * Mutation to delete a document from a workspace.
 * Invalidates document list on success so UI refreshes automatically.
 */
export function useDeleteDocument(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      deleteDocument(workspaceId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.list(workspaceId),
      });
    },
  });
}

/**
 * Fetches member contributions awaiting an approval decision.
 * Only meaningful for OWNER and EDITOR; the API rejects other roles.
 *
 * @param workspaceId workspace being moderated
 * @param enabled     skip the request when the user cannot moderate
 */
export function usePendingApprovals(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: documentKeys.pending(workspaceId),
    queryFn: () => fetchPendingApprovals(workspaceId),
    enabled: !!workspaceId && enabled,
  });
}

/**
 * Fetches the count of pending contributions, for the nav badge.
 *
 * Polls slowly so a contribution that arrives while the owner is working shows
 * up without a reload; the endpoint is a single COUNT query.
 */
export function usePendingApprovalCount(workspaceId: string, enabled = true) {
  return useQuery({
    queryKey: documentKeys.pendingCount(workspaceId),
    queryFn: () => fetchPendingApprovalCount(workspaceId),
    enabled: !!workspaceId && enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Approves a contribution so it enters ingestion and becomes retrievable.
 * Refreshes both the document list and the approval queue.
 */
export function useApproveDocument(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => approveDocument(workspaceId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}

/**
 * Declines a contribution with a reason shown to the contributor.
 */
export function useRejectDocument(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      rejectDocument(workspaceId, documentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });
}
