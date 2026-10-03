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
import { shadows } from '../../src/design/shadows';
import { UCIcon } from '../../src/components/uc-icon';
import { UCBadge } from '../../src/components/uc-badge';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { fetchJson } from '../../src/lib/api-client';

interface DiscussionItem {
  id: string;
  title: string;
  body: string;
  authorName?: string;
  workspaceName?: string;
  label?: 'QUESTION' | 'DISCUSSION' | 'ANNOUNCEMENT' | 'NOTE';
  voteScore: number;
  replyCount: number;
  createdAt: string;
  hasAiAnswer?: boolean;
  pinned?: boolean;
}

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
    setVotedMap((prev) => {
      const current = !!prev[id];
      const next = !current;
      setFeed((items) =>
        items.map((item) =>
          item.id === id ? { ...item, voteScore: item.voteScore + (next ? 1 : -1) } : item
        )
      );
      return { ...prev, [id]: next };
    });
  };

  const filteredFeed =
    activeFilter === 'ALL' ? feed : feed.filter((item) => item.label === activeFilter);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Category Pills */}
      <View style={styles.filterRow}>
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
      </View>

      {/* Feed Cards */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.listWrap}>
          {filteredFeed.map((item) => {
            const hasVoted = !!votedMap[item.id];
            return (
              <UCGlassCard key={item.id} variant="light" style={styles.feedCard}>
                {/* Card Meta */}
                <View style={styles.cardMetaRow}>
                  <View style={styles.authorAvatar}>
                    <Text style={styles.authorInitial}>
                      {(item.authorName || 'U').charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.metaTextWrap}>
                    <Text style={styles.authorName}>{item.authorName || 'Sinh viên'}</Text>
                    <Text style={styles.workspaceTag}>
                      {item.workspaceName || 'Không gian chung'} • {item.createdAt}
                    </Text>
                  </View>
                  {item.pinned ? (
                    <View style={styles.pinBadge}>
                      <UCIcon name="push-pin" size={12} color="#B45309" />
                      <Text style={styles.pinText}>Ghim</Text>
                    </View>
                  ) : null}
                </View>

                {/* Card Content */}
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardBody} numberOfLines={3}>
                  {item.body}
                </Text>

                {/* Card Footer */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={[styles.votePill, hasVoted && styles.votePillActive]}
                    onPress={() => handleVote(item.id)}
                    activeOpacity={0.7}
                  >
                    <UCIcon
                      name="arrow-upward"
                      size={14}
                      color={hasVoted ? '#FFFFFF' : colors.primary}
                    />
                    <Text style={[styles.voteText, hasVoted && styles.voteTextActive]}>
                      {item.voteScore}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.commentPill}>
                    <UCIcon name="chat-bubble-outline" size={14} color="#64748B" />
                    <Text style={styles.commentText}>{item.replyCount} thảo luận</Text>
                  </View>

                  {item.hasAiAnswer ? (
                    <View style={styles.aiAnswerBadge}>
                      <UCIcon name="auto-awesome" size={12} color="#0369A1" />
                      <Text style={styles.aiAnswerText}>Đã có lời giải AI</Text>
                    </View>
                  ) : null}
                </View>
              </UCGlassCard>
            );
          })}
        </View>
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
    ...shadows.glass,
  },
  filterText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
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
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  authorInitial: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  metaTextWrap: {
    flex: 1,
  },
  authorName: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '700',
  },
  workspaceTag: {
    color: '#94A3B8',
    fontSize: 11,
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    gap: 3,
  },
  pinText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardBody: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  votePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    gap: 4,
  },
  votePillActive: {
    backgroundColor: colors.primary,
  },
  voteText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  voteTextActive: {
    color: '#FFFFFF',
  },
  commentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    color: '#64748B',
    fontSize: 12,
  },
  aiAnswerBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    gap: 4,
  },
  aiAnswerText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '600',
  },
});
