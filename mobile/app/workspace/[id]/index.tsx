/**
 * Màn hình của một nhóm: dải bìa mang danh tính, rồi bốn mục thuộc về nhóm đó.
 *
 * Trước đây màn này là một thẻ số liệu cộng ba thẻ "Chức năng chính" dẫn sang
 * các màn riêng, nên Tệp, Thành viên và Giới thiệu nằm rải rác hoặc không tồn
 * tại. Giờ tất cả ở lại trong trang này; những đích đến thứ yếu — lịch sử hội
 * thoại, xoá nhóm — nằm trong menu "..." ở góc, nơi dành cho việc rời đi.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';

import { colors, spacing } from '../../../src/design/tokens';
import { typography } from '../../../src/design/typography';
import { UCScreenContainer } from '../../../src/components/uc-screen-container';
import { UCSkeletonCard } from '../../../src/components/uc-skeleton';
import { useToast } from '../../../src/lib/toast-context';
import { useAuth } from '../../../src/features/auth/auth-context';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import { GroupHero } from '../../../src/features/workspaces/components/group-hero';
import { GroupTabBar } from '../../../src/features/workspaces/components/group-tab-bar';
import { GroupAboutTab } from '../../../src/features/workspaces/components/group-about-tab';
import { GroupMembersTab } from '../../../src/features/workspaces/components/group-members-tab';
import { GroupPostsTab } from '../../../src/features/workspaces/components/group-posts-tab';
import { GroupDocumentsTab } from '../../../src/features/workspaces/components/group-documents-tab';
import { isValidUuid } from '../../../src/lib/uuid';

import type { GroupTabKey } from '../../../src/features/workspaces/components/group-tab-bar';
import type {
  GroupMember,
  WorkspaceDetail,
} from '../../../src/features/workspaces/workspace-types';

export default function WorkspaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<GroupTabKey>('posts');

  const isOwner = workspace?.userRole === 'OWNER';

  const loadWorkspace = useCallback(async () => {
    if (!isValidUuid(id)) {
      setLoading(false);
      return;
    }
    try {
      setWorkspace(await workspaceApi.getWorkspace(id));
    } catch (err: unknown) {
      showToast({
        message: err instanceof Error ? err.message : 'Không tải được thông tin nhóm',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  // Dải bìa chạy lên dưới thanh trạng thái, nên chữ trên thanh phải sáng; các
  // màn khác vẫn nền sáng nên trả lại khi rời đi.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );

  // Chỉ nạp khi người xem thật sự mở mục Thành viên: Core API từ chối danh sách
  // này với mọi vai trò khác chủ sở hữu, nên hỏi trước là chuốc lấy một lỗi.
  useEffect(() => {
    if (tab !== 'members' || !isOwner || !isValidUuid(id)) return;
    let cancelled = false;
    setMembersLoading(true);
    workspaceApi
      .getWorkspaceMembers(id)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        showToast({
          message: err instanceof Error ? err.message : 'Không tải được danh sách thành viên',
          type: 'error',
        });
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, isOwner, id, showToast]);

  const tabs = useMemo(
    () => [
      { key: 'posts' as const, label: 'Bài viết', count: workspace?.postCount },
      { key: 'documents' as const, label: 'Tệp', count: workspace?.documentCount },
      { key: 'members' as const, label: 'Thành viên', count: workspace?.memberCount },
      { key: 'about' as const, label: 'Giới thiệu' },
    ],
    [workspace?.postCount, workspace?.documentCount, workspace?.memberCount],
  );

  const askAssistant = () => router.push(`/workspace/${id}/chat/index` as never);

  const handleMenu = () => {
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      {
        text: 'Lịch sử hội thoại',
        onPress: () => router.push(`/workspace/${id}/conversations` as never),
      },
    ];
    if (isOwner) {
      options.push({ text: 'Xoá nhóm này', style: 'destructive', onPress: confirmDelete });
    }
    options.push({ text: 'Đóng', style: 'cancel' });
    Alert.alert(workspace?.name ?? 'Nhóm', undefined, options);
  };

  const confirmDelete = () => {
    if (!id || !workspace) return;
    Alert.alert(
      'Xoá nhóm',
      `Bạn có chắc muốn xoá nhóm "${workspace.name}"? Mọi tài liệu và cuộc trò chuyện sẽ bị xoá vĩnh viễn.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            try {
              await workspaceApi.deleteWorkspace(id);
              showToast({ message: 'Đã xoá nhóm', type: 'success' });
              router.replace('/(tabs)');
            } catch (err: unknown) {
              showToast({
                message: err instanceof Error ? err.message : 'Không xoá được nhóm',
                type: 'error',
              });
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <UCScreenContainer>
        <View style={styles.loadingBox}>
          <UCSkeletonCard />
        </View>
      </UCScreenContainer>
    );
  }

  if (!workspace) {
    return (
      <UCScreenContainer>
        <View style={styles.loadingBox}>
          <Text style={styles.notFound}>Không tìm thấy nhóm này.</Text>
        </View>
      </UCScreenContainer>
    );
  }

  // Tệp và Bài viết tự cuộn bằng danh sách của chúng, nên không bọc thêm một
  // ScrollView nữa: hai vùng cuộn lồng nhau thì không vùng nào cuộn đúng.
  const scrolls = tab === 'about' || tab === 'members';

  const header = (
    <>
      <GroupHero
        workspace={workspace}
        documentCount={workspace.documentCount}
        memberCount={workspace.memberCount}
        onBack={() => router.back()}
        onMenu={handleMenu}
        onAskAssistant={askAssistant}
      />
      <GroupTabBar tabs={tabs} active={tab} onChange={setTab} />
    </>
  );

  return (
    <UCScreenContainer surface="canvas">
      {scrolls ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadWorkspace();
              }}
            />
          }
        >
          {header}
          <View style={styles.tabBody}>
            {tab === 'about' && (
              <GroupAboutTab
                workspace={workspace}
                isOwner={isOwner}
                onEditDescription={() =>
                  showToast({
                    message: 'Sửa mô tả nhóm hiện chỉ có trên bản web.',
                    type: 'info',
                  })
                }
                onAskAssistant={askAssistant}
              />
            )}
            {tab === 'members' && (
              <GroupMembersTab
                members={members}
                loading={membersLoading}
                isOwner={isOwner}
                currentUserId={user?.id ?? ''}
                onInvite={() =>
                  showToast({
                    message: 'Mời thành viên hiện chỉ có trên bản web.',
                    type: 'info',
                  })
                }
              />
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          {tab === 'posts' && <GroupPostsTab workspaceId={id} header={header} />}
          {tab === 'documents' && (
            <GroupDocumentsTab workspaceId={id} canEdit={isOwner} header={header} />
          )}
        </View>
      )}
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 120 },
  tabBody: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  loadingBox: {
    padding: spacing.lg,
  },
  notFound: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
