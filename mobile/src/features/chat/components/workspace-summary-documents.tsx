import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import { fetchJson } from '../../../lib/api-client';
import type { WorkspaceSummaryResult } from '../chat-types';
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

/** Loads authorized canonical document summaries in bounded pages. */
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
  return <View>
    <TouchableOpacity onPress={() => { setOpened(!opened); if (!page) void load(0); }}>
      <Text>{opened ? 'Ẩn tóm tắt từng tài liệu' : 'Xem tóm tắt từng tài liệu'}</Text>
    </TouchableOpacity>
    {opened && <View>
      {result && <View>
        <Text>Tóm tắt từ {result.documentCount} tài liệu, {result.processedChunkCount} đoạn.</Text>
        <Text>Nguồn tổng quan:</Text>
        {result.overviewChunkIds?.map((chunkId) => <WorkspaceSummarySource key={chunkId}
          workspaceId={workspaceId} summaryId={summaryId} chunkId={chunkId} />)}
        {result.crossDocumentInsights.map((insight, index) => <View key={index}>
          <Text>{insight.text}</Text><Text>Nguồn:</Text>
          {insight.chunkIds.map((chunkId) => <WorkspaceSummarySource key={chunkId}
            workspaceId={workspaceId} summaryId={summaryId} chunkId={chunkId} />)}
        </View>)}
      </View>}
      <Text>Đã tải {items.length}/{page?.totalElements ?? 0} tài liệu.</Text>
      {items.map((item) => <View key={item.documentId}>
        <Text>{item.fileName}</Text><Text>{item.summary}</Text>
        <Text>{item.processedChunkCount} đoạn đã xử lý</Text>
        {item.topics.length > 0 && <Text>Chủ đề: {item.topics.join(', ')}</Text>}
        {item.citations.map((claim, index) => <View key={`${item.documentId}-${index}`}>
          <Text>{claim.text} Nguồn:</Text>
          {claim.chunkIds.map((chunkId) => <WorkspaceSummarySource key={chunkId}
            workspaceId={workspaceId} summaryId={summaryId} chunkId={chunkId} />)}
        </View>)}
      </View>)}
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {page && page.page + 1 < page.totalPages && <TouchableOpacity disabled={loading}
        onPress={() => void load(page.page + 1)}><Text>Tải thêm tài liệu</Text></TouchableOpacity>}
      {loading && <Text>Đang tải…</Text>}
    </View>}
  </View>;
}
