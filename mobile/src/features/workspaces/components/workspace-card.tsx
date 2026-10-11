import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { UCGlassCard } from '../../../components/uc-glass-card';
import { WorkspaceItem } from '../workspace-types';
import { groupThemeFor } from '../group-theme';

interface WorkspaceCardProps {
  workspace: WorkspaceItem;
  mode: 'mine' | 'explore';
  index?: number;
  onPress?: (id: string) => void;
  onJoin?: (id: string) => void;
}

export function WorkspaceCard({
  workspace,
  mode,
  index = 0,
  onPress,
  onJoin,
}: WorkspaceCardProps) {
  const isExplore = mode === 'explore';
  const theme = groupThemeFor(workspace.id);
  const initial = (workspace.name || 'W').trim().charAt(0).toUpperCase();

  const handleCardPress = () => {
    if (!isExplore && onPress) {
      onPress(workspace.id);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={isExplore ? 1 : 0.85}
      onPress={handleCardPress}
      testID={`workspace-card-${workspace.id}`}
      style={styles.touchable}
    >
      <UCGlassCard
        variant="light"
        style={styles.card}
        entering="slide"
        enteringIndex={index}
      >
        {/* Dynamic Cover Banner with Mesh Gradient & Watermark Initial */}
        <LinearGradient
          colors={[theme.from, theme.via, theme.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.coverBanner}
        >
          {/* Subtle watermark letter glyph for authentic depth texture */}
          <Text style={styles.watermarkGlyph} aria-hidden={true}>
            {initial}
          </Text>

          {/* Frosted Glass Header Badges */}
          <View style={styles.coverBadgesRow}>
            <View style={styles.avatarGlassBadge}>
              <Text style={styles.avatarBadgeText}>{initial}</Text>
            </View>

            <View style={styles.glassVisibilityBadge}>
              <UCIcon
                name={workspace.visibility === 'PUBLIC' ? 'public' : 'lock'}
                size={12}
                color="#FFFFFF"
              />
              <Text style={styles.glassVisibilityText}>
                {workspace.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {workspace.name}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {workspace.description || 'Không gian học tập & nghiên cứu tài liệu.'}
          </Text>

          {/* Footer Metadata & Action Pill */}
          <View style={styles.cardFooter}>
            <View style={styles.statsCluster}>
              <View style={styles.statPill}>
                <UCIcon name="description" size={13} color={colors.secondary} />
                <Text style={styles.statPillText}>
                  {workspace.documentCount || 0} tài liệu
                </Text>
              </View>

              <View style={styles.statPill}>
                <UCIcon name="group" size={13} color={colors.outline} />
                <Text style={styles.statPillText}>
                  {workspace.memberCount || 1} thành viên
                </Text>
              </View>
            </View>

            {isExplore ? (
              <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => onJoin?.(workspace.id)}
                activeOpacity={0.8}
                testID={`join-btn-${workspace.id}`}
              >
                <Text style={styles.joinBtnText}>Tham gia</Text>
                <UCIcon name="add" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.openPill}>
                <Text style={styles.openPillText}>Vào học</Text>
                <UCIcon name="arrow-forward" size={13} color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </UCGlassCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 248, 0.9)',
  },
  coverBanner: {
    height: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  watermarkGlyph: {
    position: 'absolute',
    right: 12,
    bottom: -18,
    fontSize: 88,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.18)',
  },
  coverBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarGlassBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  glassVisibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  glassVisibilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardBody: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 248, 0.6)',
  },
  statsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(144, 168, 255, 0.35)',
  },
  openPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  joinBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
