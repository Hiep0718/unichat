import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { UCIcon } from '../../../components/uc-icon';
import { button, palette, radii, spacing } from '../../../design/tokens';
import { fonts, typography } from '../../../design/typography';
import { fetchJson } from '../../../lib/api-client';
import { WorkspaceSummarySource } from './workspace-summary-source';

import type { WorkspaceSummaryResult } from '../chat-types';

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
  const sources = (chunkIds: readonly string[]) => <View style={styles.sources}>
    {chunkIds.map((chunkId) => <WorkspaceSummarySource key={chunkId}
      workspaceId={workspaceId} summaryId={summaryId} chunkId={chunkId} />)}
  </View>;
  return <View style={styles.wrap}>
    <Pressable
      style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ expanded: opened }}
      onPress={() => { setOpened(!opened); if (!page) void load(0); }}
    >
      <UCIcon name={opened ? 'expand-less' : 'expand-more'} size={18} color={button.secondaryInk} />
      <Text style={styles.toggleText}>{opened ? 'Ẩn tóm tắt từng tài liệu' : 'Xem tóm tắt từng tài liệu'}</Text>
    </Pressable>
    {opened && <View style={styles.body}>
      {result && <View style={styles.block}>
        <Text style={styles.meta}>Tóm tắt từ {result.documentCount} tài liệu, {result.processedChunkCount} đoạn.</Text>
        <Text style={styles.label}>Nguồn tổng quan</Text>
        {sources(result.overviewChunkIds ?? [])}
        {result.crossDocumentInsights.length > 0 && <View style={styles.block}>
          <Text style={styles.heading}>Liên hệ giữa các tài liệu</Text>
          {result.crossDocumentInsights.map((insight, index) => <View key={index} style={styles.item}>
            <Text style={styles.text}>{insight.text}</Text>
            {sources(insight.chunkIds)}
          </View>)}
        </View>}
      </View>}
      <Text style={styles.meta}>Đã tải {items.length}/{page?.totalElements ?? 0} tài liệu.</Text>
      {items.map((item) => <View key={item.documentId} style={styles.card}>
        <Text style={styles.heading}>{item.fileName}</Text>
        <Text style={styles.text}>{item.summary}</Text>
        <Text style={styles.meta}>{item.processedChunkCount} đoạn đã xử lý</Text>
        {item.topics.length > 0 && <Text style={styles.meta}>Chủ đề: {item.topics.join(', ')}</Text>}
        {item.citations.map((claim, index) => <View key={`${item.documentId}-${index}`} style={styles.item}>
          <Text style={styles.text}>{claim.text}</Text>
          {sources(claim.chunkIds)}
        </View>)}
      </View>)}
      {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      {page && page.page + 1 < page.totalPages && <Pressable
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        accessibilityRole="button"
        disabled={loading}
        onPress={() => void load(page.page + 1)}
      ><Text style={styles.toggleText}>Tải thêm tài liệu</Text></Pressable>}
      {loading && <Text style={styles.meta}>Đang tải…</Text>}
    </View>}
  </View>;
}

/* Nút mở/tải thêm là nút phụ (viền, bo tròn) theo quy ước nút của web. */
const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, gap: spacing.sm },
  toggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 7,
    borderRadius: button.radius,
    borderWidth: 1,
    borderColor: button.secondaryBorder,
    backgroundColor: button.secondaryBg,
  },
  toggleText: { fontSize: 13, fontFamily: fonts.semibold, color: button.secondaryInk },
  pressed: { opacity: 0.8 },
  body: { gap: spacing.sm },
  block: { gap: 6 },
  card: { gap: 6, padding: 12, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.vien, backgroundColor: palette.nen },
  item: { gap: 4 },
  heading: { fontSize: 14, fontFamily: fonts.bold, color: palette.muc },
  label: { fontSize: 12, fontFamily: fonts.semibold, color: palette.mucNhat },
  text: { ...typography.bodyMd, color: palette.muc },
  meta: { ...typography.bodySm, color: palette.mucNhat },
  sources: { flexDirection: 'row', flexWrap: 'wrap' },
  error: { ...typography.bodySm, color: palette.hong },
});
