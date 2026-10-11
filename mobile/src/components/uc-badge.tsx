import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../design/tokens';
import { typography } from '../design/typography';
import { UCIcon, IconName } from './uc-icon';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface UCBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: IconName;
  style?: ViewStyle;
}

export function UCBadge({
  label,
  variant = 'neutral',
  size = 'md',
  icon,
  style,
}: UCBadgeProps) {
  const theme = badgeThemes[variant];

  return (
    <View
      style={[
        styles.base,
        styles[size],
        { backgroundColor: theme.bg, borderColor: theme.border },
        style,
      ]}
    >
      {icon ? (
        <UCIcon
          name={icon}
          size={size === 'sm' ? 12 : 14}
          color={theme.text}
          style={styles.icon}
        />
      ) : null}
      <Text style={[typography.labelSm, { color: theme.text }]}>{label}</Text>
    </View>
  );
}

const badgeThemes: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  primary: {
    bg: colors.primaryFixed,
    text: colors.onPrimaryFixed,
    border: 'transparent',
  },
  secondary: {
    bg: colors.secondaryContainer,
    text: colors.onSecondaryContainer,
    border: 'transparent',
  },
  success: {
    bg: '#DCFCE7',
    text: '#166534',
    border: '#BBF7D0',
  },
  warning: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#FDE68A',
  },
  error: {
    bg: colors.errorContainer,
    text: colors.onErrorContainer,
    border: 'transparent',
  },
  neutral: {
    bg: colors.surfaceContainer,
    text: colors.onSurfaceVariant,
    border: colors.outlineVariant,
  },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.full,
    borderWidth: 0.5,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs + 2,
  },
  md: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
  },
});
