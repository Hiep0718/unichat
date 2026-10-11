import { useCallback } from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  Platform,
  Pressable,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { glass, colors, radii, spacing } from '../design/tokens';
import { shadows } from '../design/shadows';
import { typography } from '../design/typography';
import { useMicroBounce } from '../design/animations';
import { UCIcon, IconName } from './uc-icon';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg';

interface UCButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Tactile button with Reanimated micro-bounce press animation.
 * Primary and danger variants trigger light haptic feedback on iOS.
 */
export function UCButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
}: UCButtonProps) {
  const isInteractive = !disabled && !loading;
  const { scale, pressIn, pressOut } = useMicroBounce(0.96);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (isInteractive) pressIn();
  }, [isInteractive, pressIn]);

  const handlePressOut = useCallback(() => {
    if (isInteractive) pressOut();
  }, [isInteractive, pressOut]);

  const handlePress = useCallback(() => {
    if (!isInteractive) return;
    if (Platform.OS === 'ios' && (variant === 'primary' || variant === 'danger')) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [isInteractive, variant, onPress]);

  const buttonStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[size],
    disabled ? styles.disabled : {},
    style ?? {},
  ];

  const textColor = getTextColor(variant, disabled);

  return (
    <Pressable
      testID={testID}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={!isInteractive}
    >
      <Animated.View style={[buttonStyles, animatedScale]}>
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <>
            {icon ? (
              <UCIcon
                name={icon}
                size={size === 'sm' ? 16 : 20}
                color={textColor}
                style={styles.icon}
              />
            ) : null}
            <Text style={[styles.text, typography.labelMd, { color: textColor }]}>
              {title}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

function getTextColor(variant: ButtonVariant, disabled: boolean): string {
  if (disabled) return colors.outline;
  switch (variant) {
    case 'primary':
      return colors.onPrimary;
    case 'secondary':
      return colors.onSecondaryContainer;
    case 'outline':
      return colors.primary;
    case 'ghost':
      return colors.primary;
    case 'danger':
      return colors.onError;
    case 'glass':
      return colors.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  icon: {
    marginRight: spacing.sm,
  },
  text: {
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  // Variants
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  secondary: {
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },
  glass: {
    backgroundColor: glass.surface,
    borderWidth: 1.2,
    borderColor: glass.border,
    ...shadows.glass,
  },
  disabled: {
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Sizes
  sm: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    borderRadius: radii.lg,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    borderRadius: radii.xl,
  },
  lg: {
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
    borderRadius: radii['2xl'],
  },
});
