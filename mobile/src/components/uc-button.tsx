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
import { button, colors, glass, palette, spacing } from '../design/tokens';
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
 * Nút bấm có hiệu ứng nảy nhẹ khi nhấn, theo quy ước nút của web.
 * Nút chính và nút nguy hiểm rung nhẹ trên iOS.
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
  if (disabled) return palette.mucMo;
  switch (variant) {
    case 'primary':
      return button.primaryInk;
    case 'danger':
      return colors.onError;
    case 'secondary':
    case 'outline':
      return button.secondaryInk;
    case 'ghost':
    case 'glass':
      return colors.primary;
  }
}

/*
 * Quy ước nút của web (`--btn-*`): hành động chính tô màu nhấn, hành động
 * phụ là nút viền, cả hai bo viên thuốc. Không bóng đổ ở trạng thái nghỉ.
 * `secondary` và `outline` trước đây là hai kiểu khác nhau (nền xanh ngọc
 * và viền xanh); web chỉ có một kiểu nút phụ nên giờ hai tên trỏ cùng một kiểu.
 */
const outlined: ViewStyle = {
  backgroundColor: button.secondaryBg,
  borderWidth: 1,
  borderColor: button.secondaryBorder,
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: button.radius,
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
    backgroundColor: button.primaryBg,
  },
  secondary: outlined,
  outline: outlined,
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
    backgroundColor: palette.ke,
    borderColor: palette.vien,
    shadowOpacity: 0,
    elevation: 0,
  },
  // Sizes
  sm: {
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    minHeight: 34,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  lg: {
    paddingVertical: 15,
    paddingHorizontal: spacing.xl,
    minHeight: 54,
  },
});
