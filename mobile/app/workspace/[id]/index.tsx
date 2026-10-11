import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { colors, spacing, radii } from '../../../src/design/tokens';
import { typography } from '../../../src/design/typography';
import { UCIcon } from '../../../src/components/uc-icon';
import { UCBadge } from '../../../src/components/uc-badge';
import { UCButton } from '../../../src/components/uc-button';
import { UCGlassCard } from '../../../src/components/uc-glass-card';
import { UCScreenContainer } from '../../../src/components/uc-screen-container';
import { UCSkeletonCard } from '../../../src/components/uc-skeleton';
import { useToast } from '../../../src/lib/toast-context';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import { WorkspaceDetail } from '../../../src/features/workspaces/workspace-types';
import { WorkspaceQuickAction } from '../../../src/features/workspaces/components/workspace-quick-action';
import { isValidUuid } from '../../../src/lib/uuid';

export default function WorkspaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  const loadWorkspace = useCallback(async () => {
    if (!isValidUuid(id)) {
      setLoading(false);
      return;
    }
    try {
      const data = await workspaceApi.getWorkspace(id);
      setWorkspace(data);
    } catch (err: any) {
      showToast({ message: err.message || 'Không thể tải thông tin không gian', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const onRefresh = () => {
    setRefreshing(true);
    loadWorkspace();
  };

  const handleDelete = () => {
    if (!id || !workspace) return;
    Alert.alert(
      'Xóa không gian làm việc',
      `Bạn có chắc chắn muốn xóa không gian "${workspace.name}"? Mọi tài liệu và cuộc trò chuyện sẽ bị xóa vĩnh viễn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await workspaceApi.deleteWorkspace(id);
              showToast({ message: 'Đã xóa không gian làm việc', type: 'success' });
              router.replace('/(tabs)');
            } catch (err: any) {
              showToast({ message: err.message || 'Không thể xóa không gian', type: 'error' });
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <UCScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <UCSkeletonCard />
        ) : workspace ? (
          <>
            {/* Header info */}
            <UCGlassCard variant="navy" style={styles.headerCard} glow>
              <View style={styles.titleRow}>
                <Text style={styles.workspaceName} numberOfLines={2}>
                  {workspace.name}
                </Text>
                <UCBadge
                  label={workspace.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                  variant={workspace.visibility === 'PUBLIC' ? 'secondary' : 'neutral'}
                  size="sm"
                />
              </View>

              <Text style={styles.description}>
                {workspace.description || 'Không gian học tập, tổng hợp kiến thức và hỏi đáp tài liệu.'}
              </Text>

              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <UCIcon name="description" size={18} color="#57DFFE" />
                  <Text style={styles.statNumber}>{workspace.documentCount || 0}</Text>
                  <Text style={styles.statLabel}>Tài liệu</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <UCIcon name="group" size={18} color="#57DFFE" />
                  <Text style={styles.statNumber}>{workspace.memberCount || 1}</Text>
                  <Text style={styles.statLabel}>Thành viên</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <UCIcon name="shield" size={18} color="#57DFFE" />
                  <Text style={styles.statNumber}>{workspace.userRole || 'MEMBER'}</Text>
                  <Text style={styles.statLabel}>Vai trò</Text>
                </View>
              </View>
            </UCGlassCard>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Chức năng chính</Text>
            <View style={styles.actionGrid}>
              <WorkspaceQuickAction
                title="Hỏi đáp AI"
                subtitle="Trò chuyện với AI dựa trên tài liệu"
                actionText="Bắt đầu chat"
                icon="chat"
                iconBgColor="#EFF6FF"
                actionColor={colors.primary}
                onPress={() => router.push(`/workspace/${id}/chat/index` as any)}
                testID="action-chat"
              />

              <WorkspaceQuickAction
                title="Lịch sử hội thoại"
                subtitle="Xem lại các phiên hỏi đáp đã lưu"
                actionText="Xem lịch sử"
                icon="history"
                iconBgColor="#F5F3FF"
                actionColor="#7C3AED"
                onPress={() => router.push(`/workspace/${id}/conversations` as any)}
                testID="action-history"
              />

              <WorkspaceQuickAction
                title="Kho tài liệu"
                subtitle="Xem và tải lên giáo trình, slide"
                actionText="Quản lý tài liệu"
                icon="folder"
                iconBgColor="#ECFDF5"
                actionColor={colors.secondary}
                onPress={() => router.push(`/workspace/${id}/documents` as any)}
                testID="action-documents"
              />
            </View>

            {/* Delete Workspace Button (if owner) */}
            {workspace.userRole === 'OWNER' && (
              <View style={styles.dangerZone}>
                <UCButton
                  title="Xóa không gian này"
                  variant="danger"
                  onPress={handleDelete}
                  loading={deleting}
                />
              </View>
            )}
          </>
        ) : (
          <View style={styles.notFoundBox}>
            <Text style={styles.notFoundText}>Không tìm thấy thông tin không gian làm việc.</Text>
          </View>
        )}
      </ScrollView>
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  headerCard: {
    padding: spacing.xl,
    borderRadius: radii['2xl'],
    marginBottom: spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  workspaceName: {
    ...typography.headlineLg,
    color: '#FFFFFF',
    flex: 1,
    fontWeight: '700',
  },
  description: {
    ...typography.bodyMd,
    color: '#DCE1FF',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statNumber: {
    ...typography.labelMd,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: '#90A8FF',
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  actionGrid: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  dangerZone: {
    marginTop: spacing.md,
  },
  notFoundBox: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  notFoundText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
