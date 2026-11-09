import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../src/components/uc-icon';
import { workplace } from '../../../src/design/tokens';
import { useAuth } from '../../../src/features/auth/auth-context';
import { CommentComposer } from '../../../src/features/feed/components/comment-composer';
import { PostDetailBody } from '../../../src/features/feed/components/post-detail-body';
import { ReplyRow } from '../../../src/features/feed/components/reply-row';
import { buildReplyRows } from '../../../src/features/feed/reply-tree';
import { useToggleBookmark } from '../../../src/features/feed/use-feed';
import { usePostDetail } from '../../../src/features/feed/use-post-detail';
import { useToast } from '../../../src/lib/toast-context';
import { isValidUuid } from '../../../src/lib/uuid';

import type { ReplyRow as ReplyRowData } from '../../../src/features/feed/reply-tree';

function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/feed' as never);
}

/** Đọc `saved` từ đường dẫn: '1' / '0', hoặc không có khi không biết. */
function initialSaved(value: string | undefined): boolean | undefined {
  if (value === '1') return true;
  if (value === '0') return false;
  return undefined;
}

/** Màn chi tiết một bài viết: nội dung, cảm xúc và bình luận lồng nhau. */
export default function PostDetailScreen() {
  const { workspaceId, postId, saved } = useLocalSearchParams<{ workspaceId: string; postId: string; saved?: string }>();
  if (!isValidUuid(workspaceId) || !isValidUuid(postId)) {
    return (
      <View style={styles.center}>
        <Text style={styles.stateText}>Bài viết không tồn tại.</Text>
        <Pressable onPress={goBack} accessibilityRole="button">
          <Text style={styles.link}>Quay lại</Text>
        </Pressable>
      </View>
    );
  }
  return <PostDetail workspaceId={workspaceId} postId={postId} saved={initialSaved(saved)} />;
}

interface PostDetailProps {
  readonly workspaceId: string;
  readonly postId: string;
  readonly saved: boolean | undefined;
}

function PostDetail({ workspaceId, postId, saved }: PostDetailProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const post = usePostDetail(workspaceId, postId);
  const toggleBookmark = useToggleBookmark();
  const [bookmarked, setBookmarked] = useState(saved);
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);

  const rows = useMemo(() => buildReplyRows(post.replies.data ?? []), [post.replies.data]);
  const detail = post.detail.data;
  const isAuthor = detail !== undefined && user?.id === detail.authorId;

  const fail = useCallback((message: string) => showToast({ message, type: 'error' }), [showToast]);

  const handleBookmark = useCallback(() => {
    toggleBookmark(postId).then(setBookmarked).catch(() => fail('Không lưu được bài viết. Vui lòng thử lại.'));
  }, [toggleBookmark, postId, fail]);

  const handleSubmit = useCallback(async (body: string) => {
    try {
      await post.addReply(body, replyTarget?.id);
      setReplyTarget(null);
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Không gửi được bình luận');
      throw error;
    }
  }, [post, replyTarget, fail]);

  const handleAccept = useCallback((replyId: string) => {
    post.toggleAccepted(replyId).catch(() => fail('Không cập nhật được lời giải'));
  }, [post, fail]);

  const renderRow = useCallback(({ item }: { item: ReplyRowData }) => (
    <ReplyRow
      row={item}
      accepted={detail?.acceptedReplyId === item.reply.id}
      canAccept={isAuthor}
      onReply={(id, name) => setReplyTarget({ id, name })}
      onToggleAccepted={handleAccept}
      onReactionsChange={post.setReplyReactions}
    />
  ), [detail?.acceptedReplyId, isAuthor, handleAccept, post.setReplyReactions]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Quay lại">
          <UCIcon name="chevron-left" size={28} color={workplace.ink} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{detail?.workspaceName ?? 'Bài viết'}</Text>
      </View>

      {post.detail.isLoading && <ActivityIndicator style={styles.center} color={workplace.accent} />}
      {post.detail.isError && (
        <Pressable style={styles.center} onPress={() => void post.refresh()} accessibilityRole="button">
          <Text style={styles.stateText}>Không tải được bài viết. Chạm để thử lại.</Text>
        </Pressable>
      )}
      {detail && (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.reply.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={post.replies.isRefetching} onRefresh={() => void post.refresh()} />}
          ListHeaderComponent={
            <>
              <PostDetailBody
                post={detail}
                bookmarked={bookmarked}
                onBookmark={bookmarked === undefined ? undefined : handleBookmark}
                onReactionsChange={post.setPostReactions}
              />
              <RepliesHeading count={rows.length} aiPending={post.aiPending} />
            </>
          }
          ListEmptyComponent={<RepliesState loading={post.replies.isLoading} failed={post.replies.isError} />}
          testID="post-replies"
        />
      )}
      {detail && (
        <CommentComposer replyingTo={replyTarget?.name ?? null} onCancelReply={() => setReplyTarget(null)} onSubmit={handleSubmit} />
      )}
    </KeyboardAvoidingView>
  );
}

function RepliesHeading({ count, aiPending }: { readonly count: number; readonly aiPending: boolean }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingText}>Bình luận ({count})</Text>
      {aiPending && (
        <View style={styles.waiting} testID="ai-pending">
          <ActivityIndicator size="small" color={workplace.accent} />
          <Text style={styles.waitingText}>Trợ lý đang trả lời...</Text>
        </View>
      )}
    </View>
  );
}

function RepliesState({ loading, failed }: { readonly loading: boolean; readonly failed: boolean }) {
  if (loading) return <ActivityIndicator color={workplace.accent} />;
  const text = failed ? 'Không tải được bình luận. Kéo xuống để thử lại.' : 'Chưa có bình luận nào. Hãy là người đầu tiên!';
  return <Text style={[styles.stateText, styles.repliesEmpty]}>{text}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: workplace.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: workplace.card,
    borderBottomWidth: 1,
    borderBottomColor: workplace.line,
  },
  headerTitle: { flex: 1, color: workplace.ink, fontSize: 16, fontFamily: 'Inter_700Bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  list: { padding: 14, paddingBottom: 24 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headingText: { color: workplace.ink, fontSize: 15, fontFamily: 'Inter_700Bold' },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waitingText: { color: workplace.accent, fontSize: 12.5, fontFamily: 'Inter_500Medium' },
  stateText: { textAlign: 'center', color: workplace.inkMuted, fontSize: 14 },
  repliesEmpty: { paddingVertical: 24 },
  link: { color: workplace.accent, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
