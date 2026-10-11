import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { UCIcon } from '../../src/components/uc-icon';
import { UCScreenContainer } from '../../src/components/uc-screen-container';
import { UCSkeletonList } from '../../src/components/uc-skeleton';
import { useToast } from '../../src/lib/toast-context';
import { workspaceApi } from '../../src/features/workspaces/workspace-api';
import { chatApi } from '../../src/features/chat/chat-api';
import { WorkspaceItem } from '../../src/features/workspaces/workspace-types';
import { ConversationItem } from '../../src/types/api';
import { groupThemeFor } from '../../src/features/workspaces/group-theme';
import { formatRelativeTime } from '../../src/lib/format-time';

export default function ChatTabScreen() {
  const { showToast } = useToast();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string>('all');
  const [conversationsByWs, setConversationsByWs] = useState<Record<string, ConversationItem[]>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const wsRes = await workspaceApi.getWorkspaces({ page: 0, size: 20 });
      const wsItems = wsRes.content || [];
      setWorkspaces(wsItems);

      // Fetch conversations for all workspaces in parallel
      const convEntries = await Promise.all(
        wsItems.map(async (ws) => {
          try {
            const res = await chatApi.getConversations(ws.id, { limit: 20 });
            return [ws.id, res.items || []] as const;
          } catch {
            return [ws.id, []] as const;
          }
        })
      );

      const convMap: Record<string, ConversationItem[]> = {};
      for (const [wsId, items] of convEntries) {
        convMap[wsId] = items as ConversationItem[];
      }
      setConversationsByWs(convMap);
    } catch (err: any) {
      showToast({
        message: err.message || 'Không thể tải danh sách cuộc trò chuyện',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOpenConversation = (workspaceId: string, conversationId: string) => {
    router.push(`/workspace/${workspaceId}/chat/${conversationId}` as any);
  };

  const handleStartNewChat = (workspaceId?: string) => {
    const targetWsId =
      workspaceId ||
      (selectedWsId !== 'all' ? selectedWsId : workspaces[0]?.id);
    if (!targetWsId) {
      router.push('/(tabs)' as any);
      return;
    }
    router.push(`/workspace/${targetWsId}/chat/index` as any);
  };

  const handleDelete = (workspaceId: string, conversation: ConversationItem) => {
    Alert.alert(
      'Xóa cuộc hội thoại',
      `Bạn có chắc muốn xóa "${conversation.title || 'Cuộc trò chuyện'}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(conversation.id);
              await chatApi.deleteConversation(workspaceId, conversation.id);
              setConversationsByWs((prev) => ({
                ...prev,
                [workspaceId]: (prev[workspaceId] || []).filter(
                  (c) => c.id !== conversation.id
                ),
              }));
              showToast({ message: 'Đã xóa cuộc hội thoại', type: 'success' });
            } catch (err: any) {
              showToast({
                message: err.message || 'Không thể xóa hội thoại',
                type: 'error',
              });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // Filter workspaces based on selector
  const activeWorkspaces = useMemo(() => {
    if (selectedWsId === 'all') return workspaces;
    return workspaces.filter((w) => w.id === selectedWsId);
  }, [workspaces, selectedWsId]);

  // Compute total conversations count
  const totalCount = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let sum = 0;
    for (const ws of activeWorkspaces) {
      const items = conversationsByWs[ws.id] || [];
      const filtered = q
        ? items.filter((c) => (c.title || '').toLowerCase().includes(q))
        : items;
      sum += filtered.length;
    }
    return sum;
  }, [activeWorkspaces, conversationsByWs, searchQuery]);

  return (
    <UCScreenContainer gradient={false}>
      {/* Top Workspace Filter Capsules */}
      <View style={styles.topFilterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.wsCapsuleScroll}
        >
          <TouchableOpacity
            style={[styles.wsCapsule, selectedWsId === 'all' && styles.wsCapsuleActive]}
            onPress={() => setSelectedWsId('all')}
            activeOpacity={0.75}
            testID="filter-all-workspaces"
          >
            <UCIcon
              name="all-inclusive"
              size={14}
              color={selectedWsId === 'all' ? '#FFFFFF' : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.wsCapsuleText,
                selectedWsId === 'all' && styles.wsCapsuleTextActive,
              ]}
            >
              Tất cả ({workspaces.length})
            </Text>
          </TouchableOpacity>

          {workspaces.map((ws) => {
            const isSelected = selectedWsId === ws.id;
            const theme = groupThemeFor(ws.id);
            const convCount = (conversationsByWs[ws.id] || []).length;
            return (
              <TouchableOpacity
                key={ws.id}
                style={[styles.wsCapsule, isSelected && styles.wsCapsuleActive]}
                onPress={() => setSelectedWsId(ws.id)}
                activeOpacity={0.75}
                testID={`filter-workspace-${ws.id}`}
              >
                <LinearGradient
                  colors={[theme.from, theme.via]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.wsCapsuleDot}
                >
                  <Text style={styles.wsCapsuleInitial}>
                    {(ws.name || 'W').charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <Text
                  style={[
                    styles.wsCapsuleText,
                    isSelected && styles.wsCapsuleTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {ws.name}
                </Text>
                {convCount > 0 && (
                  <View
                    style={[
                      styles.wsBadge,
                      isSelected ? styles.wsBadgeActive : styles.wsBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.wsBadgeText,
                        isSelected && styles.wsBadgeTextActive,
                      ]}
                    >
                      {convCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search & Actions Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <UCIcon name="search" size={16} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm nội dung cuộc hội thoại..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              testID="chat-search-input"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <UCIcon name="close" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => handleStartNewChat()}
            activeOpacity={0.8}
            testID="tab-new-chat-btn"
          >
            <UCIcon name="add" size={17} color="#FFFFFF" />
            <Text style={styles.newChatBtnText}>Chat mới</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Pill */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {totalCount} phiên hội thoại {selectedWsId !== 'all' ? 'trong không gian này' : ''}
          </Text>
        </View>
      </View>

      {/* Main Conversation List Grouped by Workspace */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <UCSkeletonList count={4} />
        ) : workspaces.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <UCIcon name="workspaces" size={32} color="#00687A" />
            </View>
            <Text style={styles.emptyTitle}>Bạn chưa tham gia không gian nào</Text>
            <Text style={styles.emptySub}>
              Tham gia hoặc tạo một không gian để bắt đầu hỏi đáp với tài liệu.
            </Text>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/(tabs)' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryActionText}>Khám phá không gian →</Text>
            </TouchableOpacity>
          </View>
        ) : totalCount === 0 ? (
          <View style={styles.emptyContainer} testID="empty-conversations-state">
            <View style={styles.emptyIconBox}>
              <UCIcon name="forum" size={32} color="#00687A" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Không tìm thấy cuộc hội thoại phù hợp' : 'Chưa có phiên hội thoại nào'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `Thử thay đổi từ khóa tìm kiếm "${searchQuery}" hoặc tạo cuộc trò chuyện mới.`
                : 'Bắt đầu bằng cách hỏi UniChat AI một câu hỏi từ tài liệu trong Workspace.'}
            </Text>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => handleStartNewChat()}
              activeOpacity={0.8}
            >
              <UCIcon name="chat" size={17} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Bắt đầu cuộc trò chuyện ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.groupListWrap}>
            {activeWorkspaces.map((ws) => {
              const allItems = conversationsByWs[ws.id] || [];
              const q = searchQuery.toLowerCase().trim();
              const items = q
                ? allItems.filter((c) => (c.title || '').toLowerCase().includes(q))
                : allItems;

              if (items.length === 0 && selectedWsId === 'all') return null;

              const theme = groupThemeFor(ws.id);

              return (
                <View key={ws.id} style={styles.wsSection}>
                  {/* Workspace Group Section Header */}
                  <View style={styles.wsSectionHeader}>
                    <View style={styles.wsSectionLeft}>
                      <LinearGradient
                        colors={[theme.from, theme.via]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.wsHeaderDot}
                      >
                        <Text style={styles.wsHeaderInitial}>
                          {(ws.name || 'W').charAt(0).toUpperCase()}
                        </Text>
                      </LinearGradient>
                      <View style={styles.wsHeaderTextWrap}>
                        <Text style={styles.wsSectionTitle} numberOfLines={1}>
                          {ws.name}
                        </Text>
                        <Text style={styles.wsSectionSub}>
                          {items.length} cuộc hội thoại • {ws.documentCount || 0} tài liệu
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.sectionChatBtn}
                      onPress={() => handleStartNewChat(ws.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <UCIcon name="add" size={14} color={colors.primary} />
                      <Text style={styles.sectionChatText}>Chat mới</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Conversation Cards in this Workspace */}
                  <View style={styles.convCardsWrap}>
                    {items.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.convCard}
                        onPress={() => handleOpenConversation(ws.id, c.id)}
                        activeOpacity={0.7}
                        testID={`conv-item-${c.id}`}
                      >
                        <View style={styles.convIconBox}>
                          <UCIcon name="chat-bubble-outline" size={17} color="#00687A" />
                        </View>

                        <View style={styles.convDetails}>
                          <Text style={styles.convTitle} numberOfLines={2}>
                            {c.title || 'Cuộc hội thoại chưa đặt tên'}
                          </Text>
                          <View style={styles.convMeta}>
                            <UCIcon name="schedule" size={12} color="#64748B" />
                            <Text style={styles.convTime}>
                              {formatRelativeTime(c.lastMessageAt || c.createdAt)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.convActions}>
                          <TouchableOpacity
                            style={styles.convDeleteBtn}
                            onPress={() => handleDelete(ws.id, c)}
                            activeOpacity={0.7}
                            disabled={deletingId === c.id}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            testID={`delete-conv-${c.id}`}
                          >
                            <UCIcon name="delete-outline" size={18} color="#94A3B8" />
                          </TouchableOpacity>
                          <UCIcon name="chevron-right" size={18} color="#CBD5E1" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  topFilterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs + 2,
    zIndex: 10,
  },
  wsCapsuleScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
    paddingVertical: 4,
  },
  wsCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.full,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  wsCapsuleActive: {
    backgroundColor: '#00236F',
    borderColor: '#00236F',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  wsCapsuleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsCapsuleInitial: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wsCapsuleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    maxWidth: 150,
  },
  wsCapsuleTextActive: {
    color: '#FFFFFF',
  },
  wsBadge: {
    borderRadius: radii.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  wsBadgeInactive: {
    backgroundColor: 'rgba(0, 104, 122, 0.08)',
  },
  wsBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  wsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00687A',
  },
  wsBadgeTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 2,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00236F',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    gap: 4,
  },
  newChatBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
  },
  statsRow: {
    paddingHorizontal: spacing.md + 2,
    paddingTop: 6,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  groupListWrap: {
    gap: spacing.md + 2,
  },
  wsSection: {
    backgroundColor: 'transparent',
  },
  wsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs + 2,
    paddingHorizontal: 2,
  },
  wsSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  wsHeaderDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wsHeaderInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wsHeaderTextWrap: {
    flex: 1,
  },
  wsSectionTitle: {
    ...typography.labelMd,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  wsSectionSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  sectionChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  sectionChatText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  convCardsWrap: {
    gap: spacing.xs + 2,
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.sm,
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  convIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 104, 122, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convDetails: {
    flex: 1,
  },
  convTitle: {
    ...typography.labelMd,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 19,
    marginBottom: 3,
  },
  convMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  convTime: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  convActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  convDeleteBtn: {
    padding: 6,
    borderRadius: radii.full,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 104, 122, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineMd,
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.bodyMd,
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00236F',
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radii.full,
    gap: 6,
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
