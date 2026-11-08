/**
 * Tệp của một nhóm, và bao nhiêu trong số đó trợ lý đọc được.
 *
 * Con số "x/y" đếm ngay tại đây từ danh sách đã nạp, chứ không hỏi server: một
 * tệp còn đang được nạp vào kho vector thì trợ lý chưa dùng tới được, nên con
 * số tổng sẽ nói quá những gì nó biết.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, radii, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { UCSkeletonList } from '../../../components/uc-skeleton';
import { useToast } from '../../../lib/toast-context';
import { DocumentList } from '../../documents/document-list';
import { DocumentUpload } from '../../documents/document-upload';
import { countReady } from '../../documents/document-status';
import { workspaceApi } from '../workspace-api';

import type { DocumentItem } from '../workspace-types';

interface GroupDocumentsTabProps {
  readonly workspaceId: string;
  /** Chỉ chủ sở hữu và biên tập viên xoá được tệp đã có. */
  readonly canEdit: boolean;
  /** Dải bìa và thanh tab, cuộn cùng danh sách. */
  readonly header: React.ReactElement;
}

export function GroupDocumentsTab({ workspaceId, canEdit, header }: GroupDocumentsTabProps) {
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await workspaceApi.getWorkspaceDocuments(workspaceId);
      setDocuments(res.content ?? []);
    } catch (err: unknown) {
      showToast({
        message: err instanceof Error ? err.message : 'Không tải được danh sách tài liệu',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const { ready, total } = useMemo(() => countReady(documents), [documents]);

  const handleDelete = async (documentId: string) => {
    try {
      await workspaceApi.deleteDocument(workspaceId, documentId);
      showToast({ message: 'Đã xoá tài liệu', type: 'success' });
      await load();
    } catch (err: unknown) {
      showToast({
        message: err instanceof Error ? err.message : 'Không xoá được tài liệu',
        type: 'error',
      });
    }
  };

  const listHeader = (
    <>
      {header}
      <View style={styles.summaryWrap}>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {total === 0 ? (
              'Chưa có tệp nào trong nhóm'
            ) : (
              <>
                <Text style={styles.summaryStrong}>{`${ready}/${total}`}</Text>
                {' tệp sẵn sàng cho Trợ lý AI'}
              </>
            )}
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              setRefreshing(true);
              load();
            }}
            accessibilityRole="button"
            accessibilityLabel="Tải lại danh sách tệp"
          >
            <UCIcon name="refresh" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {uploadOpen && (
        <View style={styles.uploadWrap}>
          <DocumentUpload
            workspaceId={workspaceId}
            onUploadSuccess={() => {
              setUploadOpen(false);
              load();
            }}
          />
        </View>
      )}

      {loading && (
        <View style={styles.padded}>
          <UCSkeletonList count={4} />
        </View>
      )}
    </>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.listWrap}>
        <DocumentList
          documents={loading ? [] : documents}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          onDelete={canEdit ? handleDelete : undefined}
          header={listHeader}
          inset={spacing.md}
        />
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setUploadOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel="Tải tệp lên"
      >
        <UCIcon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Tải tệp lên</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Không kẻ lề ngang ở đây: danh sách chứa cả dải bìa và thanh tab trong phần
  // đầu, nên lề đặt lên danh sách sẽ ép cả hai hẹp lại so với các tab khác.
  // Lề thuộc về từng phần nội dung (tóm tắt, ô tải lên, thẻ tệp).
  listWrap: { flex: 1 },
  padded: { paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  summaryWrap: { paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  summaryText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  summaryStrong: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerHigh,
  },
  uploadWrap: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.full,
    backgroundColor: '#0F172A',
  },
  fabText: {
    ...typography.labelMd,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
