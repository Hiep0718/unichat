import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { colors, spacing } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { UCIcon } from '../../src/components/uc-icon';
import { UCSkeletonList } from '../../src/components/uc-skeleton';
import { useAuth } from '../../src/features/auth/auth-context';
import { useToast } from '../../src/lib/toast-context';
import { workspaceApi } from '../../src/features/workspaces/workspace-api';
import { WorkspaceItem } from '../../src/features/workspaces/workspace-types';
import { WorkspaceHero } from '../../src/features/workspaces/components/workspace-hero';
import { WorkspaceCard } from '../../src/features/workspaces/components/workspace-card';
import { WorkspaceQuickCard } from '../../src/features/workspaces/components/workspace-quick-card';
import { CreateWorkspaceModal } from '../../src/features/workspaces/create-workspace-modal';
import { ApiError } from '../../src/lib/api-client';

/** Names the failure so the reader can act on it instead of guessing. */
function describeLoadFailure(reason: unknown): string {
  if (reason instanceof ApiError) {
    if (reason.status === 401 || reason.status === 403) {
      return 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.';
    }
    return `Không tải được danh sách không gian (lỗi ${reason.status}).`;
  }
  if (reason instanceof Error && reason.message) return reason.message;
  return 'Không tải được danh sách không gian.';
}

export default function WorkspaceTabScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'mine' | 'explore'>('mine');
  const [myWorkspaces, setMyWorkspaces] = useState<WorkspaceItem[]>([]);
  const [publicWorkspaces, setPublicWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [mineRes, exploreRes] = await Promise.allSettled([
        workspaceApi.getWorkspaces({ page: 0, size: 20 }),
        workspaceApi.getExploreWorkspaces({ page: 0, size: 20 }),
      ]);

      // A failed request used to render exactly like an empty account: both
      // showed "Chưa có Không gian nào", so a dead session or a 500 read as
      // "you have no workspaces" and there was nothing on screen to tell them
      // apart.
      if (mineRes.status === 'fulfilled') {
        setMyWorkspaces(mineRes.value.content || []);
        setLoadError(null);
      } else {
        const message = describeLoadFailure(mineRes.reason);
        setLoadError(message);
        showToast({ message, type: 'error' });
      }
      if (exploreRes.status === 'fulfilled') {
        setPublicWorkspaces(exploreRes.value.content || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dải chào chạy lên dưới thanh trạng thái từ khi header của trình điều hướng
  // bị tắt, nên chữ trên thanh phải sáng; các tab khác vẫn nền sáng nên trả
  // lại khi rời màn hình.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleJoin = async (workspaceId: string) => {
    try {
      await workspaceApi.joinWorkspace(workspaceId);
      showToast({ message: 'Tham gia không gian thành công!', type: 'success' });
      await loadData();
      setTab('mine');
    } catch (err: any) {
      showToast({ message: err.message || 'Không thể tham gia không gian', type: 'error' });
    }
  };

  const handleWorkspacePress = (workspaceId: string) => {
    router.push(`/workspace/${workspaceId}` as any);
  };

  const totalDocuments = useMemo(() => {
    return myWorkspaces.reduce((acc, ws) => acc + (ws.documentCount || 0), 0);
  }, [myWorkspaces]);

  const rawList = tab === 'mine' ? myWorkspaces : publicWorkspaces;

  const currentList = useMemo(() => {
    if (!searchQuery.trim()) return rawList;
    const q = searchQuery.toLowerCase().trim();
    return rawList.filter(
      (ws) =>
        ws.name.toLowerCase().includes(q) ||
        (ws.description && ws.description.toLowerCase().includes(q))
    );
  }, [rawList, searchQuery]);

  // Tổng thành viên của các nhóm mình ở trong, cho ô đếm thứ ba ở dải chào.
  const totalMembers = useMemo(
    () => myWorkspaces.reduce((sum, ws) => sum + (ws.memberCount || 0), 0),
    [myWorkspaces],
  );

  // Nhóm vừa đổi gần đây nhất đứng đầu hàng truy cập nhanh và mang nhãn
  // "Mới nhất". Thứ tự mảng không nói lên điều gì; thời điểm mới nói.
  const recent = useMemo(
    () =>
      [...myWorkspaces]
        .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''))
        .slice(0, 6),
    [myWorkspaces],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <WorkspaceHero
          email={user?.email}
          displayName={user?.displayName}
          workspaceCount={myWorkspaces.length}
          documentCount={totalDocuments}
          memberCount={totalMembers}
          onQuickChat={() => router.push('/(tabs)/chat' as any)}
          onNotifications={() => router.push('/(tabs)/feed' as any)}
          onAccount={() => router.push('/(tabs)/account' as any)}
        />

        <View style={styles.body}>
          {/* Hai tab, dạng một thanh phân đoạn */}
          <View style={styles.segment}>
            {([
              { key: 'mine', label: 'Của tôi', icon: 'folder-shared' },
              { key: 'explore', label: 'Khám phá', icon: 'explore' },
            ] as const).map((item) => {
              const on = tab === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.segmentBtn, on && styles.segmentBtnOn]}
                  onPress={() => setTab(item.key)}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                >
                  <UCIcon
                    name={item.icon}
                    size={16}
                    color={on ? colors.onSurface : colors.onSurfaceVariant}
                  />
                  <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Truy cập nhanh — chỉ có ở tab "Của tôi": khám phá là danh mục của
              người khác, không phải thứ bạn vừa mở. */}
          {tab === 'mine' && recent.length > 0 ? (
            <View style={styles.quick}>
              <View style={styles.sectionHead}>
                <UCIcon name="bolt" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickRow}
              >
                {recent.map((ws, index) => (
                  <WorkspaceQuickCard
                    key={ws.id}
                    workspace={ws}
                    latest={index === 0}
                    onPress={handleWorkspacePress}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.listHead}>
            <Text style={styles.sectionTitle}>
              {tab === 'mine' ? 'Tất cả Workspace' : 'Không gian công khai'}
            </Text>
            <Text style={styles.count}>{currentList.length}</Text>

            {tab === 'mine' ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setIsModalOpen(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Tạo workspace mới"
              >
                <UCIcon name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.search}>
            <UCIcon name="search" size={18} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm workspace..."
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                <UCIcon name="close" size={16} color={colors.outline} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <UCSkeletonList count={3} />
          ) : loadError && tab === 'mine' ? (
            <View style={styles.empty}>
              <UCIcon name="error-outline" size={34} color={colors.error} />
              <Text style={styles.emptyTitle}>Không tải được dữ liệu</Text>
              <Text style={styles.emptyBody}>{loadError}</Text>
              <TouchableOpacity style={styles.retry} onPress={onRefresh} activeOpacity={0.85}>
                <Text style={styles.retryText}>Thử lại</Text>
                <UCIcon name="refresh" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : currentList.length > 0 ? (
            <View style={styles.list}>
              {currentList.map((ws, index) => (
                <WorkspaceCard
                  key={ws.id}
                  workspace={ws}
                  mode={tab}
                  index={index}
                  onPress={handleWorkspacePress}
                  onJoin={handleJoin}
                />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <UCIcon name="school" size={34} color={colors.primary} />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim()
                  ? 'Không tìm thấy kết quả'
                  : tab === 'mine'
                    ? 'Chưa có workspace nào'
                    : 'Chưa có workspace công khai'}
              </Text>
              {tab === 'mine' && !searchQuery.trim() ? (
                <TouchableOpacity
                  style={styles.retry}
                  onPress={() => setIsModalOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.retryText}>Tạo workspace</Text>
                  <UCIcon name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      <CreateWorkspaceModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          void loadData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scrollView: { flex: 1 },
  /* Chừa chỗ cho thanh tab dưới đáy, vốn nổi trên nội dung. */
  scrollContent: { paddingBottom: 120 },

  body: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.md },

  /* ---------- Hai tab ---------- */
  segment: {
    flexDirection: 'row',
    gap: 6,
    padding: 5,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainer,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 999,
  },
  segmentBtnOn: { backgroundColor: colors.surfaceContainerLowest },
  segmentText: { ...typography.labelMd, color: colors.onSurfaceVariant },
  segmentTextOn: { color: colors.onSurface, fontWeight: '700' },

  /* ---------- Truy cập nhanh ---------- */
  quick: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { ...typography.headlineMd, color: colors.onSurface, fontWeight: '700' },
  /* Tràn ra mép màn hình rồi đệm lại bên trong, để thẻ cuối cùng không
     bị cắt cụt ở mép phải. */
  quickRow: { gap: 12, paddingRight: spacing.md },

  /* ---------- Tiêu đề danh sách ---------- */
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  count: {
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.surfaceContainer,
    textAlign: 'center',
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
  },
  addBtn: {
    marginLeft: 'auto',
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---------- Tìm kiếm ---------- */
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    ...typography.bodyMd,
    color: colors.onSurface,
  },

  list: { gap: 10 },

  /* ---------- Trạng thái rỗng và lỗi ---------- */
  empty: {
    alignItems: 'center',
    gap: 10,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
  },
  emptyTitle: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },
  emptyBody: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  retryText: { ...typography.labelMd, color: '#FFFFFF', fontWeight: '700' },
});
