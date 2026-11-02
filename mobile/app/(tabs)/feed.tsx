import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { workplace, spacing, radii, animation } from '../../src/design/tokens';
import { shadows } from '../../src/design/shadows';
import { UCScreenContainer } from '../../src/components/uc-screen-container';
import { UCIcon, IconName } from '../../src/components/uc-icon';
import { fetchJson } from '../../src/lib/api-client';
import { DiscussionCard } from '../../src/features/feed/components/discussion-card';
import { FeedPost } from '../../src/features/feed/feed-types';

/**
 * The scope rail from the web feed, laid along the top on a narrow screen.
 *
 * Task-oriented rather than a HOT/TOP ranking, for the reason the web states:
 * ranking needs a scale this product does not have, and it buries the only
 * signal that matters — whether a question still needs an answer.
 */
const FILTERS = [
  { key: 'ALL', label: 'Tất cả', icon: 'forum' },
  { key: 'QUESTION', label: 'Hỏi đáp', icon: 'help-outline' },
  { key: 'ANNOUNCEMENT', label: 'Thông báo', icon: 'campaign' },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  icon: IconName;
}>;

type FilterKey = (typeof FILTERS)[number]['key'];

const noReactions = { counts: {}, total: 0, myReaction: null };

/**
 * Shown until the feed answers.
 *
 * The workspace ids are real UUIDs because the cover each group wears is
 * hashed from its id — a placeholder like 'ws-1' would hand every sample the
 * same tile and hide the thing these rows exist to show.
 */
const FALLBACK_FEED: FeedPost[] = [
  {
    id: '0193a1f0-0000-7000-8000-000000000001',
    workspaceId: '0193a1f0-aaaa-7000-8000-00000000000a',
    workspaceName: 'Cộng đồng AI & RAG',
    authorId: '0193a1f0-bbbb-7000-8000-00000000000b',
    authorName: 'Hoàng Minh (K65)',
    authorAvatar: null,
    title: 'Làm thế nào để cải thiện độ chính xác của RAG tiếng Việt?',
    body: 'Mình đang cấu hình `chunk_size=500` nhưng kết quả tìm kiếm ngữ nghĩa khá hạn chế. Các bạn có mẹo tối ưu hóa embedding không?',
    label: 'QUESTION',
    voteScore: 18,
    replyCount: 3,
    reactions: { counts: { LIKE: 7, LOVE: 2 }, total: 9, myReaction: null },
    backgroundKey: null,
    acceptedReplyId: '0193a1f0-cccc-7000-8000-00000000000c',
    isBookmarked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    attachments: [],
  },
  {
    id: '0193a1f0-0000-7000-8000-000000000002',
    workspaceId: '0193a1f0-dddd-7000-8000-00000000000d',
    workspaceName: 'Thông báo chung',
    authorId: '0193a1f0-eeee-7000-8000-00000000000e',
    authorName: 'Ban Đào tạo UniChat',
    authorAvatar: null,
    title: 'Ra mắt tính năng Bảng tin học thuật kiểu Reddit!',
    body: 'Bản cập nhật mới nhất hỗ trợ bình chọn câu trả lời hữu ích nhất và đính kèm trích dẫn tài liệu tự động từ AI.',
    label: 'ANNOUNCEMENT',
    voteScore: 45,
    replyCount: 8,
    reactions: { counts: { LIKE: 21, WOW: 6, LOVE: 4 }, total: 31, myReaction: 'LIKE' },
    backgroundKey: null,
    acceptedReplyId: null,
    isBookmarked: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    attachments: [],
  },
  {
    id: '0193a1f0-0000-7000-8000-000000000003',
    workspaceId: '0193a1f0-ffff-7000-8000-00000000000f',
    workspaceName: 'Khoa CNTT - Học kỳ 1',
    authorId: '0193a1f0-1111-7000-8000-000000000011',
    authorName: 'Thanh Hiệp',
    authorAvatar: null,
    title: 'Tổng hợp tài liệu ôn tập môn Kiến trúc Máy tính & Vi xử lý',
    body: '## Nội dung\nĐã tải lên bộ slide bài giảng 10 tuần học kèm ngân hàng đề thi trắc nghiệm có đáp án giải thích chi tiết.',
    label: 'QUESTION',
    voteScore: 29,
    replyCount: 0,
    reactions: noReactions,
    backgroundKey: null,
    acceptedReplyId: null,
    isBookmarked: false,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    attachments: [
      {
        id: '0193a1f0-2222-7000-8000-000000000022',
        kind: 'DOCUMENT',
        originalName: 'kien-truc-may-tinh.pdf',
        mediaType: 'application/pdf',
        byteSize: 2_400_000,
      },
    ],
  },
];

export default function FeedTabScreen() {
  const [feed, setFeed] = useState<FeedPost[]>(FALLBACK_FEED);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetchJson<{ content: FeedPost[] }>('/api/v1/feed?page=0&size=20');
      if (res?.content && res.content.length > 0) {
        setFeed(res.content);
      }
    } catch {
      // Keep fallback items for reliable display
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const handleBookmark = (id: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFeed((posts) =>
      posts.map((post) =>
        post.id === id ? { ...post, isBookmarked: !post.isBookmarked } : post
      )
    );
  };

  const filteredFeed =
    activeFilter === 'ALL' ? feed : feed.filter((post) => post.label === activeFilter);

  return (
    <UCScreenContainer surface="canvas">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View
          entering={FadeInUp.duration(animation.durationMedium)}
          style={styles.scopes}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                style={[styles.scope, active && styles.scopeActive]}
                onPress={() => setActiveFilter(filter.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <UCIcon
                  name={filter.icon}
                  size={18}
                  color={active ? workplace.accentInk : workplace.inkMuted}
                />
                <Text style={[styles.scopeText, active && styles.scopeTextActive]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={workplace.accent} />
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredFeed.map((post, index) => (
              <DiscussionCard
                key={post.id}
                post={post}
                index={index}
                onBookmark={handleBookmark}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
  },

  /** `.feed-page__scopes`: one white tray holding the scopes. */
  scopes: {
    flexDirection: 'row',
    gap: 3,
    padding: 8,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: workplace.card,
    ...shadows.card,
  },
  scope: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: radii.lg,
    backgroundColor: 'transparent',
  },
  scopeActive: {
    backgroundColor: workplace.accent,
  },
  scopeText: {
    color: workplace.inkMuted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  scopeTextActive: {
    color: workplace.accentInk,
    fontFamily: 'Inter_700Bold',
  },

  loadingBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  listWrap: {
    gap: spacing.md,
  },
});
