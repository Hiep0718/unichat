import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';
import { formatRelativeTime } from '../../../lib/format-time';
import { GroupMark } from '../../workspaces/components/group-mark';
import { hasResolutionState, resolveAnswerStatus } from '../answer-status';
import { LABEL_TEXT, STATUS_BG, STATUS_INK, STATUS_TEXT } from '../post-presentation';
import { PostActions } from './post-actions';

import type { DiscussionDetail, ReactionSummary } from '../feed-types';

interface PostDetailBodyProps {
  readonly post: DiscussionDetail;
  /** Undefined khi không biết trạng thái lưu (mở từ danh sách của nhóm). */
  readonly bookmarked?: boolean;
  readonly onBookmark?: () => void;
  readonly onReactionsChange: (summary: ReactionSummary) => void;
}

function StatusChip({ post }: { readonly post: DiscussionDetail }) {
  if (hasResolutionState(post.label ?? 'DISCUSSION')) {
    const status = resolveAnswerStatus(post.replyCount, post.acceptedReplyId !== null);
    return (
      <View style={[styles.chip, { backgroundColor: STATUS_BG[status] }]}>
        {status === 'RESOLVED' && <UCIcon name="check" size={13} color={STATUS_INK[status]} />}
        <Text style={[styles.chipText, { color: STATUS_INK[status] }]}>{STATUS_TEXT[status]}</Text>
      </View>
    );
  }
  if (!post.label || post.label === 'DISCUSSION') return null;
  return (
    <View style={[styles.chip, styles.chipPlain]}>
      <Text style={[styles.chipText, styles.chipTextPlain]}>{LABEL_TEXT[post.label] ?? post.label}</Text>
    </View>
  );
}

/**
 * Nội dung đầy đủ của bài ở đầu màn chi tiết.
 *
 * Thân bài vẽ bằng Markdown như câu trả lời AI; thư viện này không chạy HTML
 * thô, nên nội dung người dùng không thể chèn mã vào giao diện.
 */
export function PostDetailBody({ post, bookmarked, onBookmark, onReactionsChange }: PostDetailBodyProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <GroupMark workspaceId={post.workspaceId} name={post.workspaceName ?? ''} size={36} />
        <View style={styles.headText}>
          <Text style={styles.group} numberOfLines={1}>{post.workspaceName ?? 'Nhóm'}</Text>
          <Text style={styles.byline} numberOfLines={1}>
            {post.authorName} · {formatRelativeTime(post.createdAt)}{post.editedAt ? ' · đã sửa' : ''}
          </Text>
        </View>
        <StatusChip post={post} />
      </View>

      <Text style={styles.title} accessibilityRole="header">{post.title}</Text>
      <Markdown style={markdownStyles}>{post.body}</Markdown>

      {post.attachments?.length > 0 && (
        <View style={styles.attachments}>
          <UCIcon name="attach-file" size={14} color={workplace.inkMuted} />
          <Text style={styles.attachmentsText}>{post.attachments.length} tệp đính kèm · xem trên bản web</Text>
        </View>
      )}

      <PostActions
        postId={post.id}
        reactions={post.reactions}
        replyCount={post.replyCount}
        bookmarked={bookmarked}
        onReactionsChange={onReactionsChange}
        onBookmark={onBookmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: radii.xl, backgroundColor: workplace.card, marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headText: { flex: 1, minWidth: 0 },
  group: { color: workplace.ink, fontSize: 13, fontFamily: 'Inter_700Bold' },
  byline: { color: workplace.inkMuted, fontSize: 12 },
  title: { color: workplace.ink, fontSize: 20, lineHeight: 27, letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radii.lg },
  chipText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  chipPlain: { backgroundColor: workplace.chip },
  chipTextPlain: { color: workplace.inkSoft },
  attachments: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attachmentsText: { color: workplace.inkMuted, fontSize: 12 },
});

const markdownStyles = {
  body: { color: workplace.inkSoft, fontSize: 15, lineHeight: 23 },
  heading2: { color: workplace.ink, fontSize: 17, fontFamily: 'Inter_700Bold', marginTop: 8 },
  code_inline: { backgroundColor: workplace.chip, color: workplace.ink, borderRadius: 4 },
  fence: { backgroundColor: workplace.chip, borderRadius: 8, padding: 10 },
};
