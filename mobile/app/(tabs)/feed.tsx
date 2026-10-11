import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors, spacing, radii } from '../../src/design/tokens';
import { shadows } from '../../src/design/shadows';
import { UCScreenContainer } from '../../src/components/uc-screen-container';
import { fetchJson } from '../../src/lib/api-client';
import { DiscussionCard } from '../../src/features/feed/components/discussion-card';
import { DiscussionItem } from '../../src/features/feed/feed-types';

const FALLBACK_FEED: DiscussionItem[] = [
  {
    id: 'f-1',
    title: 'Làm thế nào để cải thiện độ chính xác của RAG tiếng Việt?',
    body: 'Mình đang cấu hình chunk_size=500 nhưng kết quả tìm kiếm ngữ nghĩa khá hạn chế. Các bạn có mẹo tối ưu hóa embedding không?',
    authorName: 'Hoàng Minh (K65)',
    workspaceName: 'Cộng đồng AI & RAG',
    label: 'QUESTION',
    voteScore: 18,
    replyCount: 3,
    createdAt: '2 giờ trước',
    hasAiAnswer: true,
  },
  {
    id: 'f-2',
    title: 'Ra mắt tính năng Bảng tin học thuật kiểu Reddit!',
    body: 'Bản cập nhật mới nhất hỗ trợ bình chọn câu trả lời hữu ích nhất và đính kèm trích dẫn tài liệu tự động từ AI.',
    authorName: 'Ban Đào tạo UniChat',
    workspaceName: 'Thông báo chung',
    label: 'ANNOUNCEMENT',
    voteScore: 45,
    replyCount: 8,
    createdAt: '1 ngày trước',
    pinned: true,
  },
  {
    id: 'f-3',
    title: 'Tổng hợp tài liệu ôn tập môn Kiến trúc Máy tính & Vi xử lý',
    body: 'Đã tải lên bộ slide bài giảng 10 tuần học kèm ngân hàng đề thi trắc nghiệm có đáp án giải thích chi tiết.',
    authorName: 'Thanh Hiệp',
    workspaceName: 'Khoa CNTT - Học kỳ 1',
    label: 'NOTE',
    voteScore: 29,
    replyCount: 5,
    createdAt: '3 ngày trước',
  },
];

export default function FeedTabScreen() {
  const [feed, setFeed] = useState<DiscussionItem[]>(FALLBACK_FEED);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'QUESTION' | 'ANNOUNCEMENT'>('ALL');

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetchJson<{ content: DiscussionItem[] }>('/api/v1/feed?page=0&size=20');
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

  const handleVote = (id: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const wasVoted = !!votedMap[id];
    const delta = wasVoted ? -1 : 1;
    setVotedMap((prev) => ({ ...prev, [id]: !wasVoted }));
    setFeed((items) =>
      items.map((item) =>
        item.id === id ? { ...item, voteScore: item.voteScore + delta } : item
      )
    );
  };

  const filteredFeed =
    activeFilter === 'ALL' ? feed : feed.filter((item) => item.label === activeFilter);

  return (
    <UCScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Category Pills */}
        <Animated.View entering={FadeInUp.duration(280)} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterText, activeFilter === 'ALL' && styles.filterTextActive]}>
              🔥 Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'QUESTION' && styles.filterPillActive]}
            onPress={() => setActiveFilter('QUESTION')}
          >
            <Text style={[styles.filterText, activeFilter === 'QUESTION' && styles.filterTextActive]}>
              ❓ Hỏi đáp
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'ANNOUNCEMENT' && styles.filterPillActive]}
            onPress={() => setActiveFilter('ANNOUNCEMENT')}
          >
            <Text style={[styles.filterText, activeFilter === 'ANNOUNCEMENT' && styles.filterTextActive]}>
              📢 Thông báo
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Feed Cards */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.listWrap}>
            {filteredFeed.map((item, index) => (
              <DiscussionCard
                key={item.id}
                item={item}
                index={index}
                hasVoted={!!votedMap[item.id]}
                onVote={handleVote}
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
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 248, 0.9)',
    ...shadows.sm,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.ambientNavy,
  },
  filterText: {
    color: '#475569',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  listWrap: {
    gap: spacing.md,
  },
});
