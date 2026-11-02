/**
 * Bài viết trong một nhóm.
 *
 * Dùng lại đúng thẻ mà bảng tin dùng: một component nghĩa là nền bài viết, tệp
 * đính kèm và trạng thái lời giải hoạt động y hệt nhau ở hai nơi, bởi vì đó
 * đúng là cùng một đoạn mã đang vẽ. Thẻ chỉ nhận thêm `hideGroup` — ở đây mọi
 * bài đều thuộc về cái nhóm người đọc đang nhìn.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import { colors, radii, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { UCEmptyState } from '../../../components/uc-empty-state';
import { UCSkeletonList } from '../../../components/uc-skeleton';
import { useToast } from '../../../lib/toast-context';
import { DiscussionCard } from '../../feed/components/discussion-card';
import { workspaceApi } from '../workspace-api';

import type { FeedPost } from '../../feed/feed-types';

interface GroupPostsTabProps {
  readonly workspaceId: string;
  /** Dải bìa và thanh tab, cuộn cùng danh sách. */
  readonly header: React.ReactElement;
}

/** Bộ lọc theo loại bài, đúng thứ tự mockup đưa ra. */
const FILTERS: readonly { value: string | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' },
  { value: 'QUESTION', label: 'Câu hỏi' },
  { value: 'DISCUSSION', label: 'Thảo luận' },
  { value: 'ANNOUNCEMENT', label: 'Thông báo' },
];

export function GroupPostsTab({ workspaceId, header }: GroupPostsTabProps) {
  const { showToast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [label, setLabel] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const page = await workspaceApi.getWorkspacePosts(workspaceId, { label });
      setPosts(page.content);
    } catch (err: unknown) {
      showToast({
        message: err instanceof Error ? err.message : 'Không tải được bài viết của nhóm',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, label, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filters = (
    <View style={styles.filters}>
      {FILTERS.map((filter) => {
        const isActive = filter.value === label;
        return (
          <TouchableOpacity
            key={filter.label}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => {
              setLoading(true);
              setLabel(filter.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.flex}>
      <FlatList
        data={loading ? [] : posts}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {header}
            {filters}
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.padded}>
              <UCSkeletonList count={3} />
            </View>
          ) : (
            <UCEmptyState
              title="Chưa có bài viết nào"
              description="Hãy là người đầu tiên đặt câu hỏi hoặc mở một chủ đề trong nhóm."
              icon="forum"
            />
          )
        }
        renderItem={({ item, index }) => (
          <View style={styles.cardWrap}>
            <DiscussionCard
              post={item}
              index={index}
              hideGroup
              pinned={item.pinned ?? false}
              onOpen={(postId) =>
                router.push(`/feed/posts/${postId}?workspaceId=${workspaceId}` as never)
              }
            />
          </View>
        )}
      />

      {/* Nút nổi chứ không phải một nút trong hàng điều khiển: trên màn hẹp,
          viết bài là việc phải với tới được ở bất kỳ vị trí cuộn nào. */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          showToast({ message: 'Viết bài hiện chỉ có trên bản web.', type: 'info' })
        }
        accessibilityRole="button"
        accessibilityLabel="Tạo bài viết"
      >
        <UCIcon name="add" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Tạo bài viết</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingBottom: 140 },
  padded: { paddingHorizontal: spacing.md },
  cardWrap: { paddingHorizontal: spacing.md },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  chipActive: {
    borderColor: 'transparent',
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.full,
    backgroundColor: '#0F172A',
  },
  fabText: {
    ...typography.labelMd,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
