import { useState } from 'react';
import { createPortal } from 'react-dom';
import { z } from 'zod';
import { fetchJson } from '../../lib/api-client';
import { CitationDrawer } from './components/citation-drawer';
import type { CitationItem } from './chat-types';
import './workspace-summary-source.css';

const sourceSchema = z.object({ documentId: z.string().uuid(), fileName: z.string(),
  chunkId: z.string(), locator: z.string(), excerpt: z.string(), contentHash: z.string(),
  ingestionVersion: z.number().int().positive() });

/** Opens a source locator fetched from the current authorized canonical artifact. */
export function WorkspaceSummarySource({ workspaceId, summaryId, chunkId }: {
  readonly workspaceId: string; readonly summaryId: string; readonly chunkId: string;
}) {
  const [source, setSource] = useState<CitationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetchJson(`/workspaces/${workspaceId}/workspace-summaries/${summaryId}/citations/${encodeURIComponent(chunkId)}`);
      const current = sourceSchema.parse(response);
      setSource({ citationId: current.chunkId, documentId: current.documentId,
        chunkId: current.chunkId, ingestionVersion: current.ingestionVersion,
        contentHash: current.contentHash, fileName: current.fileName,
        locator: current.locator, excerpt: current.excerpt, score: 1 });
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không mở được nguồn trích dẫn.');
    } finally { setLoading(false); }
  };
  return <span className="workspace-summary-source">
    <button type="button" disabled={loading} onClick={() => void open()} aria-label={`Mở nguồn ${chunkId}`}>
      {loading ? 'Đang mở…' : 'Mở nguồn'}</button>
    {error && <small role="alert">{error}</small>}
    {source && createPortal(<div className="workspace-summary-source__overlay" role="dialog" aria-modal="true">
      <CitationDrawer workspaceId={workspaceId} citation={source} onClose={() => setSource(null)} openAtSource />
    </div>, document.body)}
  </span>;
}
