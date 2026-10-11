import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, radii } from '../../design/tokens';
import { typography } from '../../design/typography';
import { UCIcon } from '../../components/uc-icon';
import { UCBadge } from '../../components/uc-badge';
import { UCEmptyState } from '../../components/uc-empty-state';
import { DocumentItem } from '../workspaces/workspace-types';

interface DocumentListProps {
  documents: DocumentItem[];
  refreshing: boolean;
  onRefresh: () => void;
  onDelete?: (documentId: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBadge(status: DocumentItem['status']) {
  switch (status) {
    case 'COMPLETED':
      return <UCBadge label="Đã xử lý" variant="success" size="sm" />;
    case 'PROCESSING':
      return <UCBadge label="Đang học..." variant="secondary" size="sm" />;
    case 'FAILED':
      return <UCBadge label="Lỗi tải" variant="error" size="sm" />;
    default:
      return <UCBadge label="Đang chờ" variant="neutral" size="sm" />;
  }
}

export function DocumentList({
  documents,
  refreshing,
  onRefresh,
  onDelete,
}: DocumentListProps) {
  const handleDeletePress = (doc: DocumentItem) => {
    if (!onDelete) return;
    Alert.alert('Xóa tài liệu', `Bạn có chắc muốn xóa "${doc.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => onDelete(doc.id),
      },
    ]);
  };

  return (
    <FlatList
      data={documents}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <UCEmptyState
          title="Chưa có tài liệu nào"
          description="Hãy tải lên các tài liệu PDF, DOCX hoặc TXT để AI bắt đầu học kiến thức."
          icon="description"
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card} testID={`doc-item-${item.id}`}>
          <View style={styles.iconWrap}>
            <UCIcon name="description" size={24} color={colors.primary} />
          </View>

          <View style={styles.contentWrap}>
            <Text style={styles.docName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{formatBytes(item.fileSizeBytes || 0)}</Text>
              <Text style={styles.metaDot}>•</Text>
              {getStatusBadge(item.status)}
            </View>
          </View>

          {onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeletePress(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <UCIcon name="delete-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.xxl,
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contentWrap: {
    flex: 1,
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
    gap: 6,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.outline,
  },
  metaDot: {
    color: colors.outlineVariant,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});
