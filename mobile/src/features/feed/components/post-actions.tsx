import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';
import { ReactionBar } from './reaction-bar';

import type { ReactionSummary } from '../feed-types';

interface PostActionsProps {
  readonly postId: string;
  readonly reactions: ReactionSummary;
  readonly replyCount: number;
  /** Bỏ trống thì không hiện nút lưu (như trong danh sách của một nhóm). */
  readonly bookmarked?: boolean;
  readonly onReactionsChange?: (summary: ReactionSummary) => void;
  /** Bỏ trống thì số bình luận chỉ để đọc, như trong chính màn chi tiết. */
  readonly onComments?: () => void;
  readonly onBookmark?: () => void;
}

/** Hàng chân của một bài: cảm xúc, bình luận và lưu. */
export function PostActions(props: PostActionsProps) {
  const { postId, reactions, replyCount, bookmarked, onReactionsChange, onComments, onBookmark } = props;
  return (
    <View style={styles.foot}>
      <ReactionBar targetType="DISCUSSION" targetId={postId} summary={reactions} onChange={onReactionsChange} />

      <Pressable
        style={({ pressed }) => [styles.replies, pressed && onComments && styles.pressed]}
        onPress={onComments}
        disabled={!onComments}
        accessibilityRole={onComments ? 'button' : 'text'}
        accessibilityLabel={`${replyCount} bình luận`}
        testID={`post-comments-${postId}`}
      >
        <UCIcon name="chat-bubble-outline" size={16} color={workplace.inkMuted} />
        <Text style={styles.repliesText}>{replyCount} bình luận</Text>
      </Pressable>

      {onBookmark && bookmarked !== undefined ? (
        <Pressable
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}
          onPress={onBookmark}
          accessibilityRole="button"
          accessibilityState={{ selected: bookmarked }}
          accessibilityLabel={bookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}
          testID={`post-bookmark-${postId}`}
        >
          <UCIcon
            name={bookmarked ? 'bookmark' : 'bookmark-border'}
            size={19}
            color={bookmarked ? workplace.accent : workplace.inkMuted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: workplace.line,
  },
  replies: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 4 },
  repliesText: { color: workplace.inkMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  save: {
    width: 36,
    height: 36,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  pressed: { opacity: 0.6 },
});
