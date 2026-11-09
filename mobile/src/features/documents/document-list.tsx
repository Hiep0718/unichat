import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';

import { colors, spacing, radii } from '../../design/tokens';
import { typography } from '../../design/typography';
import { UCIcon } from '../../components/uc-icon';
import { UCEmptyState } from '../../components/uc-empty-state';
import {
  duplicatedNames,
  fileKind,
  isDuplicatedName,
  presentStatus,
} from './document-status';

import type { StatusTone } from './document-status';
import type { DocumentItem } from '../workspaces/workspace-types';

interface DocumentListProps {
  documents: DocumentItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onDelete?: (documentId: string) => void;
  /** Drawn above the first card; the group's tab puts its heading here. */
  header?: React.ReactElement | undefined;
  /**
   * Lề ngang của từng thẻ và màn trống. Đặt ở đây chứ không phải lên cả danh
   * sách, vì phần đầu (dải bìa, thanh tab) phải chạy hết chiều ngang màn hình.
   */
  inset?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Màu của chấm và nhãn trạng thái, theo việc nó cần đợi hay cần để mắt tới. */
const TONE_COLOR: Record<StatusTone, string> = {
  ready: colors.success,
  working: colors.warning,
  blocked: colors.error,
};

export function DocumentList({
  documents,
  refreshing,
  onRefresh,
  onDelete,
  header,
  inset = 0,
}: DocumentListProps) {
  const insetStyle = { paddingHorizontal: inset };
  // Tính cho cả danh sách, không phải từng dòng: một cái tên không bớt trùng đi
  // chỉ vì dòng mang nó đang được vẽ riêng lẻ.
  const duplicates = useMemo(() => duplicatedNames(documents), [documents]);

  const handleDeletePress = (doc: DocumentItem) => {
    if (!onDelete) return;
    Alert.alert('Xoá tài liệu', `Bạn có chắc muốn xoá "${doc.name}"?`, [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: () => onDelete(doc.id) },
    ]);
  };

  return (
    <FlatList
      data={documents}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={insetStyle}>
          <UCEmptyState
            title="Chưa có tài liệu nào"
            description="Hãy tải lên các tài liệu PDF, DOCX hoặc TXT để trợ lý bắt đầu đọc."
            icon="description"
          />
        </View>
      }
      renderItem={({ item }) => (
        <View style={insetStyle}>
          <DocumentRow
            document={item}
            duplicated={isDuplicatedName(item.name, duplicates)}
            onDelete={onDelete ? () => handleDeletePress(item) : undefined}
          />
        </View>
      )}
    />
  );
}

interface DocumentRowProps {
  readonly document: DocumentItem;
  readonly duplicated: boolean;
  readonly onDelete?: (() => void) | undefined;
}

/** Một tệp: loại, tên, dung lượng, và trợ lý đã đọc được nó chưa. */
function DocumentRow({ document, duplicated, onDelete }: DocumentRowProps) {
  const status = presentStatus(document.status);
  const tone = TONE_COLOR[status.tone];

  return (
    <View style={styles.card} testID={`doc-item-${document.id}`}>
      {/* Loại tệp đứng cạnh tên chứ không ở cột riêng: nó là một từ ngắn, chỉ
          có nghĩa khi ở ngay bên cạnh thứ nó mô tả. */}
      <View style={styles.kindChip}>
        <Text style={styles.kindText}>{fileKind(document.mimeType)}</Text>
      </View>

      <View style={styles.contentWrap}>
        <Text style={styles.docName} numberOfLines={2}>
          {document.name}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatBytes(document.fileSizeBytes || 0)}</Text>
          <View style={[styles.statusDot, { backgroundColor: tone }]} />
          <Text style={[styles.statusText, { color: tone }]}>{status.label}</Text>
        </View>

        {/* Hai tệp trùng tên là chuyện bình thường — tải lại — nhưng người đang
            chọn xoá cái nào thì không còn cách nào phân biệt. */}
        {duplicated && (
          <Text style={styles.dupeText}>Trùng tên với một tệp khác</Text>
        )}
      </View>

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Xoá ${document.name}`}
        >
          <UCIcon name="delete-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: radii.xl,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  kindChip: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: '#FDE7E7',
    marginRight: spacing.md,
  },
  kindText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#B4301F',
    fontFamily: 'Inter_700Bold',
  },
  contentWrap: {
    flex: 1,
    minWidth: 0,
  },
  docName: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.outline,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.bodySm,
    fontWeight: '600',
  },
  dupeText: {
    ...typography.bodySm,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 4,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
