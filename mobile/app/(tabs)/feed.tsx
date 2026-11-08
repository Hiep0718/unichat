import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { UCIcon } from '../../src/components/uc-icon';
import { radii, spacing, workplace } from '../../src/design/tokens';
import { shadows } from '../../src/design/shadows';
import { DiscussionCard } from '../../src/features/feed/components/discussion-card';
import { FeedHero } from '../../src/features/feed/components/feed-hero';
import { feedApi } from '../../src/features/feed/feed-api';
import { postPath } from '../../src/features/feed/post-route';
import { flattenFeed, patchFeedPost, useFeed, useToggleBookmark } from '../../src/features/feed/use-feed';
import { useToast } from '../../src/lib/toast-context';

import type { IconName } from '../../src/components/uc-icon';
import type { FeedFilter, FeedPost, ReactionSummary } from '../../src/features/feed/feed-types';

/**
 * Bốn cách xem, cùng bộ với web cộng "Đã lưu".
 *
 * "Đã lưu" là một tab ngang hàng chứ không phải phạm vi ghép với ba tab kia:
 * máy chủ trả bài đã lưu bất kể cách sắp, nên ghép hai trục chỉ sinh ra những
 * tab bấm vào không đổi gì.
 */
const FILTERS: readonly { key: FeedFilter; label: string; icon: IconName }[] = [
  { key: 'NEW', label: 'Mới nhất', icon: 'schedule' },
  { key: 'UNANSWERED', label: 'Chưa giải đáp', icon: 'help-outline' },
  { key: 'MINE', label: 'Của tôi', icon: 'person-outline' },
  { key: 'SAVED', label: 'Đã lưu', icon: 'bookmark-border' },
];

const EMPTY_TEXT: Record<FeedFilter, { title: string; hint: string }> = {
  NEW: { title: 'Chưa có bài viết nào', hint: 'Bài viết trong các nhóm của bạn sẽ hiện ở đây.' },
  UNANSWERED: { title: 'Mọi câu hỏi đều đã được giải đáp', hint: 'Không còn câu nào đang chờ. Quay lại sau nhé.' },
  MINE: { title: 'Bạn chưa đăng bài nào', hint: 'Bài bạn đăng trong các nhóm sẽ xuất hiện ở đây.' },
  SAVED: { title: 'Chưa lưu bài nào', hint: 'Bấm biểu tượng lưu trên một bài để đọc lại sau, trên cả web lẫn điện thoại.' },
};

/** Bảng tin cộng đồng: bài viết từ mọi nhóm bạn tham gia. */
export default function FeedTabScreen() {
  const [filter, setFilter] = useState<FeedFilter>('NEW');
  const feed = useFeed(filter);
  // Số liệu là phần phụ của dải đầu: lỗi thì hiện "—", không chặn bảng tin.
  const stats = useQuery({ queryKey: ['feed-stats'], queryFn: () => feedApi.fetchStats() });
  const posts = flattenFeed(feed.data);
  const queryClient = useQueryClient();
  const toggleBookmark = useToggleBookmark();
  const { showToast } = useToast();

  const handleBookmark = useCallback((postId: string) => {
    toggleBookmark(postId).catch(() => {
      showToast({ message: 'Không lưu được bài viết. Vui lòng thử lại.', type: 'error' });
    });
  }, [toggleBookmark, showToast]);

  const handleReactions = useCallback((postId: string, reactions: ReactionSummary) => {
    patchFeedPost(queryClient, postId, { reactions });
  }, [queryClient]);

  const handleOpen = useCallback((post: FeedPost) => router.push(postPath(post) as never), []);

  const loadMore = () => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <FeedHero stats={stats.data} active={filter} onSelect={setFilter} />
            <FilterTray active={filter} onChange={setFilter} />
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.cardWrap}>
            <DiscussionCard
              post={item}
              index={index}
              onOpen={handleOpen}
              onBookmark={handleBookmark}
              onReactionsChange={handleReactions}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching}
            onRefresh={() => {
              void feed.refetch();
              void stats.refetch();
            }}
          />
        }
        ListEmptyComponent={
          <FeedState
            loading={feed.isLoading}
            failed={feed.isError}
            filter={filter}
            onRetry={() => void feed.refetch()}
          />
        }
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={workplace.accent} /> : undefined}
        testID="feed-list"
      />
    </View>
  );
}

function FilterTray({ active, onChange }: { readonly active: FeedFilter; readonly onChange: (f: FeedFilter) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trayScroll} contentContainerStyle={styles.tray}>
      {FILTERS.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            style={[styles.chip, selected && styles.chipActive]}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            testID={`feed-filter-${item.key}`}
          >
            <UCIcon name={item.icon} size={17} color={selected ? workplace.accentInk : workplace.inkMuted} />
            <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface FeedStateProps {
  readonly loading: boolean;
  readonly failed: boolean;
  readonly filter: FeedFilter;
  readonly onRetry: () => void;
}

function FeedState({ loading, failed, filter, onRetry }: FeedStateProps) {
  if (loading) return <ActivityIndicator style={styles.state} size="large" color={workplace.accent} />;
  if (failed) {
    return (
      <Pressable style={styles.state} onPress={onRetry} accessibilityRole="button">
        <UCIcon name="error-outline" size={32} color={workplace.inkMuted} />
        <Text style={styles.stateHint}>Không tải được bảng tin. Chạm để thử lại.</Text>
      </Pressable>
    );
  }
  const text = EMPTY_TEXT[filter];
  return (
    <View style={styles.state} testID="feed-empty">
      <UCIcon name="forum" size={36} color={workplace.inkMuted} />
      <Text style={styles.stateTitle}>{text.title}</Text>
      <Text style={styles.stateHint}>{text.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: workplace.canvas },
  trayScroll: { flexGrow: 0 },
  tray: { gap: 8, paddingHorizontal: spacing.md, paddingTop: 14, paddingBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: workplace.card,
    ...shadows.card,
  },
  chipActive: { backgroundColor: workplace.accent },
  chipText: { color: workplace.inkMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  chipTextActive: { color: workplace.accentInk, fontFamily: 'Inter_700Bold' },
  // Không đặt lề ngang lên danh sách: dải đầu nằm trong phần đầu của nó và
  // phải chạy hết chiều ngang. Lề thuộc về từng thẻ.
  list: { paddingBottom: 120, flexGrow: 1 },
  cardWrap: { paddingHorizontal: spacing.md },
  gap: { height: spacing.md },
  state: { alignItems: 'center', gap: 10, paddingVertical: 56, paddingHorizontal: 24 },
  stateTitle: { color: workplace.ink, fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  stateHint: { color: workplace.inkMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
