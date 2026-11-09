import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';
import { presentStatus } from '../../documents/document-status';

import type { StatusTone } from '../../documents/document-status';
import type { DocumentItem } from '../../workspaces/workspace-types';

interface SourcesSheetProps {
  readonly visible: boolean;
  readonly workspaceName: string;
  readonly documents: readonly DocumentItem[] | undefined;
  readonly loading: boolean;
  readonly onClose: () => void;
}

const TONE: Record<StatusTone, { bg: string; ink: string }> = {
  ready: { bg: workplace.okBg, ink: workplace.okInk },
  working: { bg: workplace.warnBg, ink: workplace.warnInk },
  blocked: { bg: '#FEE2E2', ink: workplace.alert },
};

/**
 * Các tài liệu trợ lý đang dựa vào, kèm trạng thái của từng tệp.
 *
 * Chỉ để xem: trợ lý luôn dùng mọi tệp đã sẵn sàng của nhóm, Core API chưa
 * cho chọn từng tệp cho một câu hỏi.
 */
export function SourcesSheet({ visible, workspaceName, documents, loading, onClose }: SourcesSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Đóng" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headText}>
            <Text style={styles.title}>Nguồn của trợ lý</Text>
            <Text style={styles.sub} numberOfLines={1}>Trợ lý dùng mọi tài liệu đã sẵn sàng của {workspaceName}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng">
            <UCIcon name="close" size={22} color={workplace.inkMuted} />
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator style={styles.state} color={workplace.accent} />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {(documents ?? []).map((doc) => <SourceRow key={doc.id} doc={doc} />)}
            {(documents ?? []).length === 0 && <Text style={styles.empty}>Nhóm chưa có tài liệu nào.</Text>}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function SourceRow({ doc }: { readonly doc: DocumentItem }) {
  const status = presentStatus(doc.status);
  const tone = TONE[status.tone];
  return (
    <View style={styles.row} testID={`source-row-${doc.id}`}>
      <View style={styles.fileIcon}>
        <UCIcon name="description" size={18} color={workplace.inkSoft} />
      </View>
      <Text style={styles.fileName} numberOfLines={2}>{doc.name || doc.originalFileName || 'Tài liệu'}</Text>
      <View style={[styles.status, { backgroundColor: tone.bg }]}>
        <Text style={[styles.statusText, { color: tone.ink }]}>{status.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { maxHeight: '75%', backgroundColor: workplace.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: workplace.line },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  headText: { flex: 1, minWidth: 0 },
  title: { color: workplace.ink, fontSize: 19, fontFamily: 'Inter_800ExtraBold' },
  sub: { color: workplace.inkMuted, fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radii.lg, backgroundColor: workplace.canvas },
  fileIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: workplace.card, alignItems: 'center', justifyContent: 'center' },
  fileName: { flex: 1, color: workplace.ink, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  status: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.full },
  statusText: { fontSize: 11.5, fontFamily: 'Inter_700Bold' },
  state: { padding: 32 },
  empty: { color: workplace.inkMuted, textAlign: 'center', padding: 24 },
});
