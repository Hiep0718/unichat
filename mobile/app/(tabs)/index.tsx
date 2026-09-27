import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, radii } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { shadows } from '../../src/design/shadows';
import { UCIcon } from '../../src/components/uc-icon';
import { UCBadge } from '../../src/components/uc-badge';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { useAuth } from '../../src/features/auth/auth-context';
import { fetchJson } from '../../src/lib/api-client';

interface WorkspaceItem {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  documentCount: number;
  memberCount: number;
  userRole?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
}

export default function WorkspaceTabScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'mine' | 'explore'>('mine');
  const [myWorkspaces, setMyWorkspaces] = useState<WorkspaceItem[]>([]);
  const [publicWorkspaces, setPublicWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const [mineRes, exploreRes] = await Promise.allSettled([
        fetchJson<PageResponse<WorkspaceItem>>('/api/v1/workspaces?page=0&size=20'),
        fetchJson<PageResponse<WorkspaceItem>>('/api/v1/workspaces/explore?page=0&size=20'),
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
      await fetchJson(`/api/v1/workspaces/${workspaceId}/join`, { method: 'POST' });
      await loadData();
      setTab('mine');
    } catch {
      // Handled silently
    }
  };

  const currentList = tab === 'mine' ? myWorkspaces : publicWorkspaces;
  const userInitial = (user?.email || 'U').charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Liquid Glass Hero Card */}
      <UCGlassCard variant="navy" style={styles.heroGlassCard} glow>
        <View style={styles.heroTopRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.heroUserText}>
            <Text style={styles.heroGreeting}>Xin chào,</Text>
            <Text style={styles.heroEmail} numberOfLines={1}>
              {user?.email || 'Sinh viên UniChat'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.statusText}>AI Active</Text>
          </View>
        </View>

        <View style={styles.heroTagRow}>
          <View style={styles.heroPill}>
            <UCIcon name="auto-awesome" size={13} color="#57DFFE" />
            <Text style={styles.heroPillText}>RAG Chuẩn xác</Text>
          </View>
          <View style={styles.heroPill}>
            <UCIcon name="menu-book" size={13} color="#ACEDFF" />
            <Text style={styles.heroPillText}>Giáo trình số</Text>
          </View>
          <View style={styles.heroPill}>
            <UCIcon name="verified-user" size={13} color="#ACEDFF" />
            <Text style={styles.heroPillText}>Trích dẫn 100%</Text>
          </View>
        </View>
      </UCGlassCard>

      {/* Glass Segment Filter */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, tab === 'mine' && styles.segmentBtnActive]}
          onPress={() => setTab('mine')}
          activeOpacity={0.8}
        >
          <UCIcon
            name="folder-shared"
            size={18}
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
            size={18}
            color={tab === 'explore' ? colors.primary : colors.outline}
          />
          <Text style={[styles.segmentText, tab === 'explore' && styles.segmentTextActive]}>
            Khám phá ({publicWorkspaces.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Workspaces List or Empty State */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang tải không gian làm việc...</Text>
        </View>
      ) : currentList.length > 0 ? (
        <View style={styles.listContainer}>
          {currentList.map((ws) => (
            <UCGlassCard key={ws.id} variant="light" style={styles.workspaceCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {ws.name}
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {ws.description || 'Không gian học tập & nghiên cứu tài liệu.'}
                  </Text>
                </View>
                <UCBadge
                  label={ws.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
                  variant={ws.visibility === 'PUBLIC' ? 'secondary' : 'neutral'}
                  size="sm"
                />
              </View>

              <View style={styles.cardStatsRow}>
                <View style={styles.statItem}>
                  <UCIcon name="description" size={15} color={colors.outline} />
                  <Text style={styles.statText}>{ws.documentCount || 0} tài liệu</Text>
                </View>
                <View style={styles.statItem}>
                  <UCIcon name="group" size={15} color={colors.outline} />
                  <Text style={styles.statText}>{ws.memberCount || 1} thành viên</Text>
                </View>
                {tab === 'explore' ? (
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoin(ws.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.joinBtnText}>Tham gia</Text>
                    <UCIcon name="add" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.openPill}>
                    <Text style={styles.openPillText}>Vào học</Text>
                    <UCIcon name="arrow-forward" size={14} color={colors.primary} />
                  </View>
                )}
              </View>
            </UCGlassCard>
          ))}
        </View>
      ) : (
        <UCGlassCard variant="light" style={styles.emptyCard}>
          <View style={styles.emptyCircle}>
            <UCIcon name="school" size={38} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {tab === 'mine' ? 'Chưa có Không gian nào' : 'Không có Không gian mới'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {tab === 'mine'
              ? 'Hãy tham gia các Không gian học tập công khai để bắt đầu hỏi đáp AI và đọc giáo trình.'
              : 'Tất cả Không gian công khai đã được bạn tham gia.'}
          </Text>
          {tab === 'mine' && publicWorkspaces.length > 0 ? (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  heroGlassCard: {
    marginBottom: spacing.md,
    borderRadius: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#57DFFE',
    marginRight: spacing.sm + 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  heroUserText: {
    flex: 1,
  },
  heroGreeting: {
    color: '#ACEDFF',
    fontSize: 13,
    fontWeight: '500',
  },
  heroEmail: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTagRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: spacing.sm + 2,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 4,
  },
  heroPillText: {
    color: '#F0F9FF',
    fontSize: 11,
    fontWeight: '500',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 248, 0.9)',
    borderRadius: 16,
    padding: 3,
    marginBottom: spacing.md,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 13,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.glass,
  },
  segmentText: {
    color: colors.outline,
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.primary,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.outline,
    fontSize: 14,
  },
  listContainer: {
    gap: spacing.sm + 4,
  },
  workspaceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    gap: 4,
  },
  statText: {
    color: '#64748B',
    fontSize: 12,
  },
  joinBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    gap: 4,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  openPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    gap: 4,
  },
  openPillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  emptyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    gap: 6,
    ...shadows.sm,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCtaOutline: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  emptyCtaOutlineText: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
  },
});
