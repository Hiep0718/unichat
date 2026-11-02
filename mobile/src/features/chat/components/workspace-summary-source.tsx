import { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';
import { fetchJson } from '../../../lib/api-client';

const sourceSchema = z.object({ documentId: z.string().uuid(), fileName: z.string(),
  chunkId: z.string(), locator: z.string(), excerpt: z.string(), contentHash: z.string(),
  ingestionVersion: z.number().int().positive() });
type Source = z.infer<typeof sourceSchema>;

/** Reauthorizes a canonical cited chunk before showing its original location and text. */
export function WorkspaceSummarySource({ workspaceId, summaryId, chunkId }: {
  readonly workspaceId: string; readonly summaryId: string; readonly chunkId: string;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetchJson<unknown>(
        `/workspaces/${workspaceId}/workspace-summaries/${summaryId}/citations/${encodeURIComponent(chunkId)}`);
      setSource(sourceSchema.parse(response));
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không mở được nguồn trích dẫn.');
    } finally { setLoading(false); }
  };
  return <View>
    <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => void open()}>
      <Text style={{ color: '#005569' }}>{loading ? 'Đang mở…' : 'Mở nguồn'}</Text>
    </TouchableOpacity>
    {error && <Text accessibilityRole="alert">{error}</Text>}
    <Modal visible={source !== null} animationType="slide" onRequestClose={() => setSource(null)}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
        <TouchableOpacity accessibilityRole="button" onPress={() => setSource(null)}><Text>Đóng</Text></TouchableOpacity>
        <Text style={{ fontWeight: '700' }}>{source?.fileName}</Text>
        <Text>Vị trí nguồn: {source?.locator}</Text>
        <Text selectable>{source?.excerpt}</Text>
      </ScrollView>
    </Modal>
  </View>;
}
