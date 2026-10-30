import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { workplace, spacing, radii, animation } from '../../../design/tokens';
import { shadows } from '../../../design/shadows';
import { UCIcon } from '../../../components/uc-icon';

import { WorkspaceItem } from '../workspace-types';
import { WorkspaceCover } from './workspace-cover';

interface WorkspaceCardProps {
  workspace: WorkspaceItem;
  mode: 'mine' | 'explore';
  index?: number;
  onPress?: (id: string) => void;
  onJoin?: (id: string) => void;
}

/**
 * A group in the dashboard list.
 *
 * The picture fills the head of the card rather than sitting beside it, and
 * the name, visibility and counts are written over it — the arrangement the
 * web uses, and the reason the group's picture had to come across with it.
 * Mobile drew a flat gradient here, so every card looked like every other one
 * and a member could not find a group by sight.
 */
export function WorkspaceCard({
  workspace,
  mode,
  index = 0,
  onPress,
  onJoin,
}: WorkspaceCardProps) {
  const isExplore = mode === 'explore';
  const isPublic = workspace.visibility === 'PUBLIC';

  return (
    <Animated.View
      entering={FadeInUp.delay(index * animation.staggerDelay).duration(
        animation.durationMedium,
      )}
      style={styles.wrap}
    >
      <Pressable
        onPress={() => (!isExplore ? onPress?.(workspace.id) : undefined)}
        testID={`workspace-card-${workspace.id}`}
        style={styles.card}
      >
        <View style={styles.cover}>
          <WorkspaceCover
            workspaceId={workspace.id}
            name={workspace.name}
            topics={workspace.topics}
          />

          <View style={styles.coverTop}>
            <View style={styles.visibility}>
              <UCIcon name={isPublic ? 'public' : 'lock'} size={12} color="#FFFFFF" />
              <Text style={styles.visibilityText}>
                {isPublic ? 'Công khai' : 'Riêng tư'}
              </Text>
            </View>
          </View>

          <Text style={styles.coverName} numberOfLines={2}>
            {workspace.name}
          </Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.desc} numberOfLines={2}>
            {workspace.description || 'Không gian học tập & nghiên cứu tài liệu.'}
          </Text>

          <View style={styles.footer}>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <UCIcon name="description" size={13} color={workplace.inkMuted} />
                <Text style={styles.statText}>
                  {workspace.documentCount || 0} tài liệu
                </Text>
              </View>

              <View style={styles.stat}>
                <UCIcon name="group" size={13} color={workplace.inkMuted} />
                <Text style={styles.statText}>
                  {workspace.memberCount || 1} thành viên
                </Text>
              </View>
            </View>

            {isExplore ? (
              <Pressable
                style={styles.joinBtn}
                onPress={() => onJoin?.(workspace.id)}
                testID={`join-btn-${workspace.id}`}
              >
                <Text style={styles.joinBtnText}>Tham gia</Text>
                <UCIcon name="add" size={15} color={workplace.accentInk} />
              </Pressable>
            ) : (
              <View style={styles.openPill}>
                <Text style={styles.openPillText}>Vào học</Text>
                <UCIcon name="arrow-forward" size={13} color={workplace.accent} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: workplace.card,
    ...shadows.card,
  },

  /** Tall enough to read as a picture; a strip reads as a coloured rule. */
  cover: {
    height: 124,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  coverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  visibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  visibilityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  coverName: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    fontFamily: 'Inter_700Bold',
  },

  body: {
    padding: spacing.md,
    gap: spacing.md,
  },
  desc: {
    color: workplace.inkSoft,
    fontSize: 14,
    lineHeight: 20,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: workplace.line,
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: workplace.chip,
  },
  statText: {
    color: workplace.inkMuted,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },

  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: workplace.accentSoft,
  },
  openPillText: {
    color: workplace.accent,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: workplace.accent,
  },
  joinBtnText: {
    color: workplace.accentInk,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
});
