import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { UCIcon } from '../../../components/uc-icon';
import { button, palette, radii, spacing } from '../../../design/tokens';
import { fonts, typography } from '../../../design/typography';
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
  return <View style={styles.wrap}>
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Mở nguồn ${chunkId}`}
      disabled={loading}
      onPress={() => void open()}
    >
      <UCIcon name="description" size={13} color={palette.nhan} />
      <Text style={styles.chipText}>{loading ? 'Đang mở…' : 'Mở nguồn'}</Text>
    </Pressable>
    {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Modal visible={source !== null} animationType="slide" onRequestClose={() => setSource(null)}>
      <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetBody}>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Đóng nguồn trích dẫn"
          onPress={() => setSource(null)}
        >
          <UCIcon name="close" size={20} color={palette.muc} />
        </Pressable>
        <Text style={styles.fileName}>{source?.fileName}</Text>
        <Text style={styles.locator}>Vị trí nguồn: {source?.locator}</Text>
        <Text style={styles.excerpt} selectable>{source?.excerpt}</Text>
      </ScrollView>
    </Modal>
  </View>;
}

/* Chip "Mở nguồn" như `.workspace-summary-source button` của web: nền nhấn nhạt, chữ nhấn, bo tròn. */
const styles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', margin: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: button.radius,
    borderWidth: 1,
    borderColor: 'rgba(4, 92, 223, 0.35)',
    backgroundColor: palette.nhanNhat,
  },
  chipText: { fontSize: 12, fontFamily: fonts.semibold, color: palette.nhan },
  pressed: { opacity: 0.75 },
  error: { ...typography.bodySm, color: palette.hong, marginTop: 2 },
  sheet: { flex: 1, backgroundColor: palette.nen },
  sheetBody: { padding: spacing.lg, gap: spacing.md },
  close: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: button.radius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ke,
  },
  fileName: { ...typography.headlineMd, fontFamily: fonts.bold, color: palette.muc },
  locator: { ...typography.bodySm, color: palette.mucNhat },
  excerpt: {
    ...typography.bodyLg,
    color: palette.muc,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: palette.beMat,
    borderLeftWidth: 3,
    borderLeftColor: palette.nhan,
  },
});
