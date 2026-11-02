import { useState } from 'react';
import { z } from 'zod';
import { fetchJson } from '../../lib/api-client';
import type { WorkspaceSummaryResult } from './chat-types';
import { WorkspaceSummarySource } from './workspace-summary-source';

const claimSchema = z.object({ text: z.string(), chunkIds: z.array(z.string()) });
const documentSchema = z.object({ documentId: z.string().uuid(), fileName: z.string(), summary: z.string(),
  topics: z.array(z.string()), citations: z.array(claimSchema), processedChunkCount: z.number().int().nonnegative() });
const pageSchema = z.object({ content: z.array(documentSchema), page: z.number().int(), size: z.number().int(),
  totalElements: z.number().int(), totalPages: z.number().int() });
const resultSchema = z.object({ summaryId: z.string().uuid(), messageId: z.string().uuid(), overview: z.string(),
  overviewChunkIds: z.array(z.string()), crossDocumentInsights: z.array(z.object({ text: z.string(),
    documentIds: z.array(z.string()), chunkIds: z.array(z.string()) })), documentCount: z.number(),
  processedChunkCount: z.number() });
type SummaryPage = z.infer<typeof pageSchema>;

/** Loads only authorized canonical per-document summaries when expanded. */
export function WorkspaceSummaryDocuments({ workspaceId, summaryId }: {
  readonly workspaceId: string; readonly summaryId: string;
}) {
  const [opened, setOpened] = useState(false);
  const [page, setPage] = useState<SummaryPage | null>(null);
  const [items, setItems] = useState<SummaryPage['content']>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkspaceSummaryResult | null>(null);
  const load = async (number: number) => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const response = await fetchJson(`/workspaces/${workspaceId}/workspace-summaries/${summaryId}/documents?page=${number}&size=20`);
      const next = pageSchema.parse(response);
      setPage(next); setItems((current) => number === 0 ? next.content : [...current, ...next.content]);
      if (!result) setResult(resultSchema.parse(await fetchJson(
        `/workspaces/${workspaceId}/workspace-summaries/${summaryId}`)));
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không tải được bản tóm tắt tài liệu.');
    } finally { setLoading(false); }
  };
  const toggle = () => { setOpened((value) => !value); if (!page) void load(0); };
  return <section className="workspace-summary-documents">
    <button type="button" onClick={toggle} aria-expanded={opened}>
      {opened ? 'Ẩn tóm tắt từng tài liệu' : 'Xem tóm tắt từng tài liệu'}
    </button>
    {opened && <div>
      {result && <>
        <p>Tóm tắt từ {result.documentCount} tài liệu, {result.processedChunkCount} đoạn.</p>
        <p>Nguồn tổng quan: {result.overviewChunkIds?.map((chunkId) =>
          <WorkspaceSummarySource key={chunkId} workspaceId={workspaceId} summaryId={summaryId} chunkId={chunkId} />)}</p>
        {result.crossDocumentInsights.length > 0 && <section>
          <h4>Liên hệ giữa các tài liệu</h4>
          <ul>{result.crossDocumentInsights.map((insight, index) => <li key={index}>
            {insight.text} <small>Nguồn: {insight.chunkIds.map((chunkId) =>
              <WorkspaceSummarySource key={chunkId} workspaceId={workspaceId} summaryId={summaryId} chunkId={chunkId} />)}</small>
          </li>)}</ul>
        </section>}
      </>}
      <p>Đã tải {items.length}/{page?.totalElements ?? 0} tài liệu.</p>
      {items.map((item) => <article key={item.documentId}>
        <h4>{item.fileName}</h4><p>{item.summary}</p>
        <p>{item.processedChunkCount} đoạn đã xử lý</p>
        {item.topics.length > 0 && <p>Chủ đề: {item.topics.join(', ')}</p>}
        <ul>{item.citations.map((claim, index) => <li key={`${item.documentId}-${index}`}>
          {claim.text} <small>Nguồn: {claim.chunkIds.map((chunkId) =>
            <WorkspaceSummarySource key={chunkId} workspaceId={workspaceId} summaryId={summaryId} chunkId={chunkId} />)}</small>
        </li>)}</ul>
      </article>)}
      {error && <p role="alert">{error}</p>}
      {page && page.page + 1 < page.totalPages && <button type="button" disabled={loading}
        onClick={() => void load(page.page + 1)}>Tải thêm tài liệu</button>}
      {loading && <p role="status">Đang tải…</p>}
    </div>}
  </section>;
}
