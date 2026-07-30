/**
 * React Query hooks for document data fetching and mutations.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteDocument, getDocuments } from './document-api';

/** Query key factory for document queries. */
const documentKeys = {
  all: ['documents'] as const,
  list: (workspaceId: string) =>
    [...documentKeys.all, 'list', workspaceId] as const,
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
