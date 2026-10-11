import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, spacing, radii } from '../../../design/tokens';
import { shadows } from '../../../design/shadows';
import { UCIcon } from '../../../components/uc-icon';
import { UCGlassCard } from '../../../components/uc-glass-card';

import { DiscussionItem } from '../feed-types';

interface DiscussionCardProps {
  item: DiscussionItem;
  index: number;
  hasVoted: boolean;
  onVote: (id: string) => void;
}

/**
 * Academic discussion card component for community feed.
 */
export function DiscussionCard({
  item,
  index,
  hasVoted,
  onVote,
}: DiscussionCardProps) {
  const authorInitial = (item.authorName || 'U').charAt(0);

  return (
    <UCGlassCard
      key={item.id}
      variant="light"
      style={styles.feedCard}
      entering="slide"
      enteringIndex={index}
    >
      <View style={styles.cardMetaRow}>
        <View style={styles.authorAvatar}>
          <Text style={styles.authorInitial}>{authorInitial}</Text>
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

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardBody} numberOfLines={3}>
        {item.body}
      </Text>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.votePill, hasVoted && styles.votePillActive]}
          onPress={() => onVote(item.id)}
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
}

const styles = StyleSheet.create({
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
    fontFamily: 'Inter_700Bold',
  },
  metaTextWrap: {
    flex: 1,
  },
  authorName: {
    color: colors.onSurface,
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_600SemiBold',
  },
  cardTitle: {
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_600SemiBold',
  },
});
