import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, spacing, radii } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { shadows } from '../../../design/shadows';
import { UCIcon, IconName } from '../../../components/uc-icon';

interface WorkspaceQuickActionProps {
  title: string;
  subtitle: string;
  actionText: string;
  icon: IconName;
  iconBgColor: string;
  actionColor: string;
  onPress: () => void;
  testID?: string;
}

/**
 * Reusable quick action card for workspace dashboard.
 */
export function WorkspaceQuickAction({
  title,
  subtitle,
  actionText,
  icon,
  iconBgColor,
  actionColor,
  onPress,
  testID,
}: WorkspaceQuickActionProps) {
  return (
    <TouchableOpacity
      style={[styles.actionCard, shadows.sm]}
      activeOpacity={0.8}
      onPress={onPress}
      testID={testID}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
        <UCIcon name={icon} size={24} color={actionColor} />
      </View>
      <Text style={styles.actionCardTitle}>{title}</Text>
      <Text style={styles.actionCardSub}>{subtitle}</Text>
      <View style={styles.actionFooter}>
        <Text style={[styles.actionLink, { color: actionColor }]}>{actionText}</Text>
        <UCIcon name="arrow-forward" size={14} color={actionColor} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionCardTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: 4,
  },
  actionCardSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  actionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLink: {
    ...typography.labelSm,
    fontWeight: '700',
  },
});
