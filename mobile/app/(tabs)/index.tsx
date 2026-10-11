import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { colors, spacing, radii } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { UCIcon } from '../../src/components/uc-icon';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { UCScreenContainer } from '../../src/components/uc-screen-container';
import { UCSkeletonList } from '../../src/components/uc-skeleton';
import { useAuth } from '../../src/features/auth/auth-context';
import { useToast } from '../../src/lib/toast-context';
import { workspaceApi } from '../../src/features/workspaces/workspace-api';
import { WorkspaceItem } from '../../src/features/workspaces/workspace-types';
import { WorkspaceHero } from '../../src/features/workspaces/components/workspace-hero';
import { WorkspaceCard } from '../../src/features/workspaces/components/workspace-card';
import { CreateWorkspaceModal } from '../../src/features/workspaces/create-workspace-modal';

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

  const loadData = useCallback(async () => {
    try {
      const [mineRes, exploreRes] = await Promise.allSettled([
        workspaceApi.getWorkspaces({ page: 0, size: 20 }),
        workspaceApi.getExploreWorkspaces({ page: 0, size: 20 }),
      ]);

      if (mineRes.status === 'fulfilled') {
        setMyWorkspaces(mineRes.value.content || []);
      }
      if (exploreRes.status === 'fulfilled') {
        setPublicWorkspaces(exploreRes.value.content || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  return (
    <UCScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Liquid Glass Hero Header */}
        <WorkspaceHero
          email={user?.email}
          displayName={user?.displayName}
          workspaceCount={myWorkspaces.length}
          documentCount={totalDocuments}
          onQuickChat={() => router.push('/(tabs)/chat' as any)}
          onCreateWorkspace={() => setIsModalOpen(true)}
        />

        {/* Liquid Glass Search & Filter Bar */}
        <Animated.View entering={FadeInUp.delay(50).duration(260)} style={styles.searchSection}>
          <View style={styles.searchBar}>
            <UCIcon name="search" size={18} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm không gian học tập..."
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <UCIcon name="close" size={16} color={colors.outline} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Liquid Glass Tab Switcher & Create Action */}
        <Animated.View entering={FadeInUp.delay(90).duration(280)}>
          <View style={styles.actionRow}>
            <View style={styles.segmentContainer}>
              <TouchableOpacity
                style={[styles.segmentBtn, tab === 'mine' && styles.segmentBtnActive]}
                onPress={() => setTab('mine')}
                activeOpacity={0.8}
              >
                <UCIcon
                  name="folder-shared"
                  size={16}
                  color={tab === 'mine' ? colors.primary : colors.outline}
                />
                <Text style={[styles.segmentText, tab === 'mine' && styles.segmentTextActive]}>
                  Của tôi ({myWorkspaces.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, tab === 'explore' && styles.segmentBtnActive]}
                onPress={() => setTab('explore')}
                activeOpacity={0.8}
              >
                <UCIcon
                  name="explore"
                  size={16}
                  color={tab === 'explore' ? colors.primary : colors.outline}
                />
                <Text style={[styles.segmentText, tab === 'explore' && styles.segmentTextActive]}>
                  Khám phá ({publicWorkspaces.length})
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setIsModalOpen(true)}
              activeOpacity={0.8}
            >
              <UCIcon name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Workspaces List */}
        {loading ? (
          <UCSkeletonList count={3} />
        ) : currentList.length > 0 ? (
          <View style={styles.listContainer}>
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
          <UCGlassCard variant="light" style={styles.emptyCard} entering="fade">
            <View style={styles.emptyCircle}>
              <UCIcon name="school" size={38} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? 'Không tìm thấy kết quả'
                : tab === 'mine'
                ? 'Chưa có Không gian nào'
                : 'Không có Không gian mới'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? `Không có không gian nào khớp với "${searchQuery}". Thử từ khóa khác.`
                : tab === 'mine'
                ? 'Hãy tạo mới hoặc khám phá không gian học tập công khai để bắt đầu hỏi đáp AI.'
                : 'Tất cả Không gian công khai đã được bạn tham gia.'}
            </Text>
            {tab === 'mine' && publicWorkspaces.length > 0 && !searchQuery.trim() ? (
              <TouchableOpacity
                style={styles.emptyCtaBtn}
                onPress={() => setTab('explore')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyCtaText}>Khám phá không gian mẫu</Text>
                <UCIcon name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.emptyCtaOutline} onPress={onRefresh} activeOpacity={0.8}>
                <Text style={styles.emptyCtaOutlineText}>Tải lại dữ liệu</Text>
              </TouchableOpacity>
            )}
          </UCGlassCard>
        )}
      </ScrollView>

      {/* Workspace Creation Modal */}
      <CreateWorkspaceModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadData();
          setTab('mine');
        }}
      />
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 110,
  },
  searchSection: {
    marginBottom: spacing.sm + 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 248, 0.85)',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  segmentContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(231, 238, 254, 0.65)',
    borderRadius: radii.full,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 248, 0.8)',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radii.full,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.outline,
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  createBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  listContainer: {
    paddingBottom: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radii['2xl'],
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  emptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.full,
    gap: spacing.sm,
  },
  emptyCtaText: {
    ...typography.labelMd,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCtaOutline: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  emptyCtaOutlineText: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '600',
  },
});
