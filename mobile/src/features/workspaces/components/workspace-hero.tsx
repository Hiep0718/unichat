import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { radii, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { UCGlassCard } from '../../../components/uc-glass-card';

interface WorkspaceHeroProps {
  email?: string;
  displayName?: string;
  workspaceCount?: number;
  documentCount?: number;
  onQuickChat?: () => void;
  onCreateWorkspace?: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function WorkspaceHero({
  email,
  displayName,
  workspaceCount = 0,
  documentCount = 0,
  onQuickChat,
  onCreateWorkspace,
}: WorkspaceHeroProps) {
  const greeting = getGreeting();
  const greetingName =
    displayName?.trim() ||
    (email ? email.split('@')[0] : 'Sinh viên UniChat');
  const userInitial = greetingName.charAt(0).toUpperCase();

  return (
    <Animated.View entering={FadeInDown.springify().damping(18).stiffness(160)}>
      <UCGlassCard variant="navy" style={styles.heroGlassCard} glow>
        {/* Top Profile & AI Status Bar */}
        <View style={styles.heroTopRow}>
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={['#57DFFE', '#1E3A8A', '#00236F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{userInitial}</Text>
            </LinearGradient>
            <View style={styles.onlineBadgeRing}>
              <View style={styles.onlineBadgeDot} />
            </View>
          </View>

          <View style={styles.heroUserText}>
            <Text style={styles.heroGreetingPrefix}>{greeting},</Text>
            <Text style={styles.heroGreetingName} numberOfLines={1}>
              {greetingName}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.statusText}>AI Active</Text>
          </View>
        </View>

        {/* Live Academic Knowledge Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statTile}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(87, 223, 254, 0.15)' }]}>
              <UCIcon name="folder" size={15} color="#57DFFE" />
            </View>
            <View>
              <Text style={styles.statNumber}>{workspaceCount}</Text>
              <Text style={styles.statLabel}>Không gian</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statTile}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <UCIcon name="description" size={15} color="#34D399" />
            </View>
            <View>
              <Text style={styles.statNumber}>{documentCount}</Text>
              <Text style={styles.statLabel}>Tài liệu số</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statTile}>
            <View style={[styles.statIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
              <UCIcon name="verified" size={15} color="#FBBF24" />
            </View>
            <View>
              <Text style={styles.statNumber}>100%</Text>
              <Text style={styles.statLabel}>Trích dẫn</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Row */}
        {(onQuickChat || onCreateWorkspace) && (
          <View style={styles.quickActionsRow}>
            {onQuickChat && (
              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={onQuickChat}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(87, 223, 254, 0.25)', 'rgba(0, 104, 122, 0.35)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionGradient}
                >
                  <UCIcon name="auto-awesome" size={15} color="#57DFFE" />
                  <Text style={styles.actionBtnText}>Hỏi AI ngay</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {onCreateWorkspace && (
              <TouchableOpacity
                style={styles.heroSecondaryAction}
                onPress={onCreateWorkspace}
                activeOpacity={0.8}
              >
                <UCIcon name="add" size={15} color="#ACEDFF" />
                <Text style={styles.secondaryBtnText}>Tạo không gian</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </UCGlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroGlassCard: {
    padding: spacing.md + 4,
    borderRadius: radii['2xl'],
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: spacing.sm + 4,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(172, 237, 255, 0.45)',
  },
  avatarText: {
    ...typography.headlineMd,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  onlineBadgeRing: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00236F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  heroUserText: {
    flex: 1,
  },
  heroGreetingPrefix: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ACEDFF',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  heroGreetingName: {
    ...typography.headlineMd,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.full,
    gap: 6,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  statTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#DCE1FF',
    lineHeight: 12,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroActionButton: {
    flex: 1,
    borderRadius: radii.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(87, 223, 254, 0.5)',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroSecondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    gap: 5,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ACEDFF',
  },
});
