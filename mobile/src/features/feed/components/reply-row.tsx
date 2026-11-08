import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { radii, workplace } from '../../../design/tokens';
import { formatRelativeTime } from '../../../lib/format-time';
import { MemberAvatar } from '../../account/components/member-avatar';
import { EMPTY_REACTIONS } from '../reactions';
import { ReactionBar } from './reaction-bar';

import type { ReactionSummary } from '../feed-types';
import type { ReplyRow as ReplyRowData } from '../reply-tree';

const INDENT_STEP = 18;

interface ReplyRowProps {
  readonly row: ReplyRowData;
  readonly accepted: boolean;
  /** Chỉ người hỏi mới thấy nút chấp nhận. */
  readonly canAccept: boolean;
  readonly onReply: (replyId: string, authorName: string) => void;
  readonly onToggleAccepted: (replyId: string) => void;
  readonly onReactionsChange: (replyId: string, summary: ReactionSummary) => void;
}

function Avatar({ name, ai }: { readonly name: string; readonly ai: boolean }) {
  if (!ai) return <MemberAvatar name={name} size={30} />;
  return (
    <View style={styles.aiAvatar}>
      <UCIcon name="smart-toy" size={17} color={workplace.accentInk} />
    </View>
  );
}

/** Một bình luận trong cây: người viết, nội dung, nguồn trích dẫn và thao tác. */
export const ReplyRow = React.memo(function ReplyRow(props: ReplyRowProps) {
  const { row, accepted, canAccept, onReply, onToggleAccepted, onReactionsChange } = props;
  const { reply } = row;
  return (
    <View style={[styles.wrap, { marginLeft: row.indent * INDENT_STEP }, row.indent > 0 && styles.nested]}>
      <View style={[styles.node, reply.isAiAnswer && styles.nodeAi, accepted && styles.nodeAccepted]}>
        <View style={styles.meta}>
          <Avatar name={reply.authorName} ai={reply.isAiAnswer} />
          <View style={styles.metaText}>
            <Text style={styles.author} numberOfLines={1}>{reply.authorName}</Text>
            <Text style={styles.time}>{formatRelativeTime(reply.createdAt)}</Text>
          </View>
          {accepted && (
            <View style={styles.badge}>
              <UCIcon name="check-circle" size={13} color={workplace.okInk} />
              <Text style={styles.badgeText}>Lời giải</Text>
            </View>
          )}
        </View>

        <Text style={styles.body}>
          {row.replyingTo ? <Text style={styles.mention}>@{row.replyingTo} </Text> : null}
          {reply.body}
        </Text>

        {reply.citations?.length > 0 && (
          <View style={styles.citations}>
            {reply.citations.map((citation) => (
              <View key={citation.citationId} style={styles.citation}>
                <UCIcon name="description" size={13} color={workplace.inkMuted} />
                <Text style={styles.citationText} numberOfLines={1}>
                  {citation.fileName}{citation.locator ? ` · ${citation.locator}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <ReactionBar
            targetType="DISCUSSION_REPLY"
            targetId={reply.id}
            summary={reply.reactions ?? EMPTY_REACTIONS}
            onChange={(summary) => onReactionsChange(reply.id, summary)}
            compact
          />
          <ActionButton icon="reply" label="Trả lời" onPress={() => onReply(reply.id, reply.authorName)} testID={`reply-to-${reply.id}`} />
          {canAccept && (
            <ActionButton
              icon={accepted ? 'undo' : 'check'}
              label={accepted ? 'Bỏ chấp nhận' : 'Chấp nhận'}
              onPress={() => onToggleAccepted(reply.id)}
              testID={`accept-${reply.id}`}
            />
          )}
        </View>
      </View>
    </View>
  );
});

interface ActionButtonProps {
  readonly icon: 'reply' | 'undo' | 'check';
  readonly label: string;
  readonly onPress: () => void;
  readonly testID: string;
}

function ActionButton({ icon, label, onPress, testID }: ActionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
    >
      <UCIcon name={icon} size={15} color={workplace.inkMuted} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  nested: { paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: workplace.line },
  node: { gap: 8, padding: 12, borderRadius: radii.lg, backgroundColor: workplace.card },
  nodeAi: { backgroundColor: workplace.accentSoft },
  nodeAccepted: { borderWidth: 1, borderColor: workplace.okInk },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  metaText: { flex: 1, minWidth: 0 },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: workplace.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  author: { color: workplace.ink, fontSize: 13.5, fontFamily: 'Inter_700Bold' },
  time: { color: workplace.inkMuted, fontSize: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: workplace.okBg,
  },
  badgeText: { color: workplace.okInk, fontSize: 11, fontFamily: 'Inter_700Bold' },
  body: { color: workplace.ink, fontSize: 14.5, lineHeight: 21 },
  mention: { color: workplace.accent, fontFamily: 'Inter_600SemiBold' },
  citations: { gap: 4 },
  citation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  citationText: { flex: 1, color: workplace.inkSoft, fontSize: 12, fontFamily: 'Inter_500Medium' },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5 },
  actionText: { color: workplace.inkMuted, fontSize: 13, fontFamily: 'Inter_500Medium' },
  pressed: { opacity: 0.6 },
});
