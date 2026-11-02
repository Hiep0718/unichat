import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { workplace, spacing, radii, animation } from '../../../design/tokens';
import { shadows } from '../../../design/shadows';
import { UCIcon } from '../../../components/uc-icon';
import { GroupMark } from '../../workspaces/components/group-mark';
import { formatRelativeTime } from '../../../lib/format-time';

import {
  hasResolutionState,
  resolveAnswerStatus,
  toPlainPreview,
  AnswerStatus,
} from '../answer-status';
import {
  LABEL_TEXT,
  STATUS_BG,
  STATUS_INK,
  STATUS_TEXT,
  usedReactions,
} from '../post-presentation';
import { FeedPost } from '../feed-types';

interface DiscussionCardProps {
  post: FeedPost;
  index: number;
  onOpen?: (id: string) => void;
  onBookmark?: (id: string) => void;
  /**
   * Giấu tên và dấu nhóm. Đặt trên trang của chính nhóm đó, nơi mọi thẻ đều
   * thuộc về cái nhóm người đọc đang nhìn.
   */
  hideGroup?: boolean;
  /** Hiện dấu đã ghim; chỉ danh sách của một nhóm mới sắp theo nó. */
  pinned?: boolean;
}

/**
 * A post in the community feed.
 *
 * The header names the group and the author and carries the resolution state
 * on the right, so a reader scanning the list learns "where is this, and does
 * it still need help?" before reaching the title — the order the web card
 * uses, and the reason the group's mark leads here rather than the author's
 * initial.
 *
 * The card takes no border: one carrying both a border and a shadow reads as
 * a wireframe. The title stays in ink so the single saturated colour is left
 * for what can be acted on.
 */
export function DiscussionCard({
  post,
  index,
  onOpen,
  onBookmark,
  hideGroup = false,
  pinned = false,
}: DiscussionCardProps) {
  const preview = toPlainPreview(post.body);
  const isQuestion = hasResolutionState(post.label);
  const status = resolveAnswerStatus(post.replyCount, post.acceptedReplyId !== null);
  const faces = usedReactions(post.reactions?.counts ?? {});

  return (
    <Animated.View
      entering={FadeInUp.delay(index * animation.staggerDelay).duration(
        animation.durationMedium,
      )}
      style={styles.card}
    >
      <PostCardHead
        post={post}
        hideGroup={hideGroup}
        pinned={pinned}
        isQuestion={isQuestion}
        status={status}
      />

      <Pressable onPress={() => onOpen?.(post.id)} accessibilityRole="button">
        <Text style={styles.title}>{post.title}</Text>
      </Pressable>

      {preview ? (
        <Text style={styles.preview} numberOfLines={2}>
          {preview}
        </Text>
      ) : null}

      {post.hasAiAnswer ? (
        <Pressable
          style={styles.ai}
          onPress={() => onOpen?.(post.id)}
          accessibilityRole="button"
          accessibilityLabel="Xem câu trả lời của trợ lý"
        >
          <UCIcon name="auto-awesome" size={14} color={workplace.accent} />
          <Text style={styles.aiText} numberOfLines={1}>
            Trợ lý AI đã trả lời
          </Text>
          <Text style={styles.aiView}>Xem</Text>
        </Pressable>
      ) : null}

      {post.attachments && post.attachments.length > 0 ? (
        <View style={styles.attachments}>
          <UCIcon name="attach-file" size={14} color={workplace.inkMuted} />
          <Text style={styles.attachmentsText}>
            {post.attachments.length} tệp đính kèm
          </Text>
        </View>
      ) : null}

      <View style={styles.foot}>
        {faces.length > 0 ? (
          <View style={styles.reactions}>
            <Text style={styles.reactionFaces}>{faces.join('')}</Text>
            <Text style={styles.reactionCount}>{post.reactions.total}</Text>
          </View>
        ) : null}

        <View style={styles.replies}>
          <UCIcon name="chat-bubble-outline" size={16} color={workplace.inkMuted} />
          <Text style={styles.repliesText}>{post.replyCount} bình luận</Text>
        </View>

        {onBookmark ? (
          <Pressable
            style={styles.save}
            onPress={() => onBookmark(post.id)}
            accessibilityRole="button"
            accessibilityLabel={post.isBookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
          >
            <UCIcon
              name={post.isBookmarked ? 'bookmark' : 'bookmark-border'}
              size={18}
              color={post.isBookmarked ? workplace.accent : workplace.inkMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

interface PostCardHeadProps {
  readonly post: FeedPost;
  readonly hideGroup: boolean;
  readonly pinned: boolean;
  readonly isQuestion: boolean;
  readonly status: AnswerStatus;
}

/**
 * Hàng đầu của thẻ: bài này ở đâu, của ai, và nó đã xong chưa.
 *
 * Tách ra vì phần vẽ của thẻ đã vượt số dòng JSX dự án cho phép trong một hàm.
 * Trong trang của chính nhóm, `hideGroup` bỏ tên và dấu nhóm đi — mọi thẻ ở đó
 * đều thuộc về cái nhóm người đọc đang nhìn.
 */
function PostCardHead({ post, hideGroup, pinned, isQuestion, status }: PostCardHeadProps) {
  return (
    <View style={[styles.head, hideGroup && styles.headWrapped]}>
      {!hideGroup && (
        <GroupMark workspaceId={post.workspaceId} name={post.workspaceName} size={34} />
      )}

      {pinned && (
        <View style={styles.pin}>
          <UCIcon name="push-pin" size={12} color={workplace.ink} />
          <Text style={styles.pinText}>Đã ghim</Text>
        </View>
      )}

      <View style={styles.headText}>
        {!hideGroup && (
          <Text style={styles.groupName} numberOfLines={1}>
            {post.workspaceName}
          </Text>
        )}
        <Text style={styles.byline} numberOfLines={1}>
          {post.authorName} · {formatRelativeTime(post.createdAt)}
        </Text>
      </View>

      {isQuestion ? (
        <View style={[styles.chip, { backgroundColor: STATUS_BG[status] }]}>
          {status === 'RESOLVED' ? (
            <UCIcon name="check" size={13} color={STATUS_INK[status]} />
          ) : null}
          <Text style={[styles.chipText, { color: STATUS_INK[status] }]}>
            {STATUS_TEXT[status]}
          </Text>
        </View>
      ) : null}

      {!isQuestion && post.label !== 'DISCUSSION' ? (
        <View style={[styles.chip, styles.chipAnnouncement]}>
          <Text style={[styles.chipText, styles.chipTextAnnouncement]}>
            {LABEL_TEXT[post.label] ?? post.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 11,
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: workplace.card,
    ...shadows.card,
  },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // Trong nhóm, hàng đầu mất dấu nhóm nên còn thừa chỗ; để pill trạng thái
  // xuống dòng riêng như mockup thay vì ép nó chen vào cùng một hàng.
  headWrapped: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: workplace.chip,
  },
  pinText: {
    fontSize: 11,
    fontWeight: '700',
    color: workplace.ink,
    fontFamily: 'Inter_700Bold',
  },
  // Không mang màu nhấn riêng: dùng đúng nền nhạt mà bảng màu này đã dành cho
  // accent, giống dải tương ứng bên web.
  ai: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.lg,
    backgroundColor: workplace.accentSoft,
  },
  aiText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '600',
    color: workplace.accent,
    fontFamily: 'Inter_600SemiBold',
  },
  aiView: {
    fontSize: 12,
    fontWeight: '600',
    color: workplace.inkMuted,
    fontFamily: 'Inter_600SemiBold',
  },
  headText: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  groupName: {
    color: workplace.ink,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_700Bold',
  },
  byline: {
    color: workplace.inkMuted,
    fontSize: 12,
    lineHeight: 16,
  },

  title: {
    color: workplace.ink,
    fontSize: 16.5,
    lineHeight: 23,
    letterSpacing: -0.2,
    fontFamily: 'Inter_700Bold',
  },
  preview: {
    color: workplace.inkSoft,
    fontSize: 14,
    lineHeight: 22,
  },

  attachments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentsText: {
    color: workplace.inkMuted,
    fontSize: 12,
  },

  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: workplace.line,
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reactionFaces: {
    fontSize: 13,
  },
  reactionCount: {
    color: workplace.inkMuted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  replies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  repliesText: {
    color: workplace.inkMuted,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  save: {
    width: 34,
    height: 34,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radii.lg,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  chipAnnouncement: {
    backgroundColor: workplace.chip,
  },
  chipTextAnnouncement: {
    color: workplace.inkSoft,
  },
});
