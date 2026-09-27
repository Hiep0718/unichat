import { ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { glass, colors, radii, spacing } from '../design/tokens';
import { shadows } from '../design/shadows';

type CardVariant = 'default' | 'outlined' | 'elevated' | 'container' | 'glass' | 'navy-glass';

interface UCCardProps {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function UCCard({
  children,
  variant = 'default',
  onPress,
  style,
}: UCCardProps) {
  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    styles[variant],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={onPress}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii['2xl'],
    padding: spacing.md,
  },
  default: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 248, 0.8)',
    ...shadows.sm,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  elevated: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...shadows.md,
  },
  container: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 248, 0.6)',
  },
  glass: {
    backgroundColor: glass.surface,
    borderWidth: 1.2,
    borderColor: glass.border,
    ...shadows.glass,
  },
  'navy-glass': {
    backgroundColor: glass.surfaceNavy,
    borderWidth: 1.2,
    borderColor: glass.borderNavy,
    ...shadows.xl,
  },
});
