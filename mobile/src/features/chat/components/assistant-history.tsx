import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';
import { shadows } from '../../../design/shadows';
import { GroupMark } from '../../workspaces/components/group-mark';
import { historyTime } from '../assistant-home';

import type { HistoryEntry, HistorySection } from '../assistant-home';

interface AssistantHistoryProps {
  readonly sections: readonly HistorySection[];
  readonly total: number;
  /** Tên nhóm đang lọc, null khi đang xem mọi nhóm. */
  readonly scopeName: string | null;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly failedGroups: number;
  readonly onToggleScope: () => void;
  readonly onOpen: (entry: HistoryEntry) => void;
  readonly onDelete: (entry: HistoryEntry) => void;
  readonly onRetry: () => void;
}

/** Lịch sử hỏi đáp, chia theo mốc thời gian. */
export function AssistantHistory(props: AssistantHistoryProps) {
  const { total, scopeName, failed, failedGroups, onToggleScope } = props;
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.title}>Lịch sử</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {scopeName ? `Trong ${scopeName}` : 'Mọi nhóm'} · {total} cuộc trò chuyện
          </Text>
        </View>
        <Pressable style={styles.scope} onPress={onToggleScope} accessibilityRole="button" testID="history-scope-toggle">
          <Text style={styles.scopeText}>{scopeName ? 'Xem mọi nhóm' : 'Chỉ nhóm này'}</Text>
        </Pressable>
      </View>

      {failedGroups > 0 && !failed && (
        <Text style={styles.warn}>Không tải được lịch sử của {failedGroups} nhóm. Kéo xuống để thử lại.</Text>
      )}
      <HistoryBody {...props} />
    </View>
  );
}

/** Phần thân: đang tải, lỗi, trống, hoặc các mốc thời gian. */
function HistoryBody({ sections, loading, failed, onOpen, onDelete, onRetry }: AssistantHistoryProps): React.ReactElement {
  if (loading) return <ActivityIndicator style={styles.state} color={workplace.accent} />;
  if (failed) {
    return (
      <Pressable style={styles.state} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.stateText}>Không tải được lịch sử. Chạm để thử lại.</Text>
      </Pressable>
    );
  }
  if (sections.length === 0) {
    return (
      <View style={styles.state} testID="history-empty">
        <UCIcon name="forum" size={30} color={workplace.inkMuted} />
        <Text style={styles.stateText}>Chưa có cuộc trò chuyện nào. Đặt câu hỏi đầu tiên ở ô phía trên.</Text>
      </View>
    );
  }
  return (
    <>
      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
          <View style={styles.card}>
            {section.entries.map((entry, index) => (
              <HistoryRow key={entry.conversation.id} entry={entry} first={index === 0} onOpen={onOpen} onDelete={onDelete} />
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

interface HistoryRowProps {
  readonly entry: HistoryEntry;
  readonly first: boolean;
  readonly onOpen: (entry: HistoryEntry) => void;
  readonly onDelete: (entry: HistoryEntry) => void;
}

function HistoryRow({ entry, first, onOpen, onDelete }: HistoryRowProps) {
  const { conversation, workspace } = entry;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, pressed && styles.pressed]}
      onPress={() => onOpen(entry)}
      onLongPress={() => onDelete(entry)}
      accessibilityRole="button"
      accessibilityHint="Nhấn giữ để xoá"
      testID={`history-row-${conversation.id}`}
    >
      <GroupMark workspaceId={workspace.id} name={workspace.name} size={40} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>{conversation.title || 'Cuộc trò chuyện chưa đặt tên'}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {historyTime(conversation.lastMessageAt || conversation.createdAt)} · {workspace.name}
        </Text>
      </View>
      <UCIcon name="chevron-right" size={20} color={workplace.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  headText: { flex: 1, minWidth: 0 },
  title: { color: workplace.ink, fontSize: 22, fontFamily: 'Inter_800ExtraBold' },
  sub: { color: workplace.inkMuted, fontSize: 13 },
  scope: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.full, backgroundColor: workplace.card, ...shadows.card },
  scopeText: { color: workplace.ink, fontSize: 13, fontFamily: 'Inter_700Bold' },
  warn: { color: workplace.warnInk, fontSize: 12.5, marginVertical: 6 },
  section: { marginTop: 14 },
  sectionTitle: { color: workplace.inkMuted, fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.4, marginBottom: 8 },
  card: { borderRadius: radii.xl, backgroundColor: workplace.card, ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: workplace.line },
  pressed: { backgroundColor: workplace.canvas },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { color: workplace.ink, fontSize: 15.5, fontFamily: 'Inter_700Bold' },
  rowSub: { color: workplace.inkMuted, fontSize: 12.5 },
  state: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 24 },
  stateText: { color: workplace.inkMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
