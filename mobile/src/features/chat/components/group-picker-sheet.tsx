import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { dock, radii, workplace } from '../../../design/tokens';
import { GroupMark } from '../../workspaces/components/group-mark';
import { canAsk } from '../assistant-home';

import type { WorkspaceItem } from '../../workspaces/workspace-types';

interface GroupPickerSheetProps {
  readonly visible: boolean;
  readonly recent: readonly WorkspaceItem[];
  readonly others: readonly WorkspaceItem[];
  readonly selectedId: string | null;
  /** "5/6 tài liệu sẵn sàng" của nhóm đang chọn, khi đã biết. */
  readonly selectedReadiness?: string;
  readonly onPick: (workspace: WorkspaceItem) => void;
  readonly onClose: () => void;
}

/**
 * Chọn nhóm để hỏi.
 *
 * Nhóm chưa có tài liệu nào bị làm mờ và không chọn được: hỏi vào đó chỉ nhận
 * về một lời từ chối vì không có căn cứ.
 */
export function GroupPickerSheet(props: GroupPickerSheetProps) {
  const { visible, recent, others, selectedId, selectedReadiness, onPick, onClose } = props;
  const insets = useSafeAreaInsets();
  const row = (workspace: WorkspaceItem) => (
    <GroupRow
      key={workspace.id}
      workspace={workspace}
      selected={workspace.id === selectedId}
      readiness={workspace.id === selectedId ? selectedReadiness : undefined}
      onPick={onPick}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Đóng" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Hỏi trong...</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" testID="group-picker-done">
            <Text style={styles.done}>Xong</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {recent.length > 0 && <Text style={styles.section}>DÙNG GẦN ĐÂY</Text>}
          {recent.map(row)}
          {others.length > 0 && <Text style={styles.section}>{recent.length > 0 ? 'NHÓM KHÁC' : 'NHÓM CỦA BẠN'}</Text>}
          {others.map(row)}
          {recent.length + others.length === 0 && (
            <Text style={styles.empty}>Bạn chưa tham gia nhóm nào. Vào tab Nhóm để tham gia hoặc tạo nhóm.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

interface GroupRowProps {
  readonly workspace: WorkspaceItem;
  readonly selected: boolean;
  readonly readiness?: string;
  readonly onPick: (workspace: WorkspaceItem) => void;
}

function GroupRow({ workspace, selected, readiness, onPick }: GroupRowProps) {
  const enabled = canAsk(workspace);
  const subtitle = !enabled ? 'Chưa có tài liệu, chưa hỏi được' : readiness ?? `${workspace.documentCount} tài liệu`;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && enabled && styles.pressed, !enabled && styles.rowDisabled]}
      onPress={() => onPick(workspace)}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !enabled }}
      accessibilityLabel={`${workspace.name}, ${subtitle}`}
      testID={`group-option-${workspace.id}`}
    >
      <GroupMark workspaceId={workspace.id} name={workspace.name} size={40} />
      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>{workspace.name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      {selected && (
        <View style={styles.check}>
          <UCIcon name="check" size={16} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: workplace.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: workplace.line },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  title: { color: workplace.ink, fontSize: 20, fontFamily: 'Inter_800ExtraBold' },
  done: { color: dock.accent, fontSize: 15, fontFamily: 'Inter_700Bold' },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  section: { color: workplace.inkMuted, fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.4, marginTop: 10, marginBottom: 6, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radii.xl, borderWidth: 1.5, borderColor: 'transparent' },
  rowSelected: { borderColor: dock.accent, backgroundColor: '#F5F7FF' },
  rowDisabled: { opacity: 0.45 },
  pressed: { backgroundColor: workplace.canvas },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { color: workplace.ink, fontSize: 15.5, fontFamily: 'Inter_700Bold' },
  rowSub: { color: workplace.inkMuted, fontSize: 13 },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: dock.accent, alignItems: 'center', justifyContent: 'center' },
  empty: { color: workplace.inkMuted, textAlign: 'center', padding: 24, lineHeight: 20 },
});
