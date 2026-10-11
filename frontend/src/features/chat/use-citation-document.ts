import { useEffect, useState } from 'react';
import { fetchBlob } from '../../lib/api-client';

/** Downloads protected citation bytes through the shared session coordinator and releases object URLs. */
export function useCitationDocument(workspaceId: string | undefined, documentId: string) {
  const key = `${workspaceId ?? ''}/${documentId}`;
  const [state, setState] = useState<{ key: string; url: string | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!workspaceId || !documentId) return;
    const controller = new AbortController();
    const resource = { url: null as string | null };
    void fetchBlob(`/workspaces/${workspaceId}/documents/${documentId}/download`, { signal: controller.signal }).then((blob) => {
      if (controller.signal.aborted) return;
      resource.url = URL.createObjectURL(blob);
      setState({ key, url: resource.url, error: null });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, url: null, error: error instanceof Error ? error.message : 'Không tải được tài liệu' });
    });
    return () => { controller.abort(); if (resource.url) URL.revokeObjectURL(resource.url); };
  }, [workspaceId, documentId, key]);
  const current = state?.key === key ? state : null;
  return { blobUrl: current?.url ?? null, fileError: current?.error ?? null,
    fileLoading: Boolean(workspaceId && documentId && current === null) };
}
