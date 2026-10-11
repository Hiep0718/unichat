import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Pressable,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, radii, spacing, animation as animConfig } from '../design/tokens';
import { typography } from '../design/typography';
import { UCIcon, IconName } from './uc-icon';

interface UCTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: IconName;
  isPassword?: boolean;
}

/**
 * Glassmorphic text input with animated focus transitions
 * and error shake animation via Reanimated.
 */
export function UCTextInput({
  label,
  error,
  hint,
  icon,
  isPassword = false,
  style,
  ...rest
}: UCTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;

  const borderProgress = useSharedValue(0);
  const shadowProgress = useSharedValue(0);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    borderProgress.value = withTiming(
      isFocused ? 1 : 0,
      { duration: animConfig.durationMedium, easing: Easing.out(Easing.cubic) },
    );
    shadowProgress.value = withTiming(
      isFocused ? 1 : 0,
      { duration: animConfig.durationMedium },
    );
  }, [isFocused, borderProgress, shadowProgress]);

  useEffect(() => {
    if (hasError) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-6, { duration: 50 }),
        withTiming(6, { duration: 50 }),
        withTiming(-3, { duration: 50 }),
        withSpring(0, animConfig.springSnappy),
      );
    }
  }, [hasError, error, shakeX]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? colors.error
      : borderProgress.value > 0.5
      ? colors.primary
      : 'rgba(226, 232, 248, 0.9)',
    borderWidth: borderProgress.value > 0.5 ? 1.5 : 1.2,
    backgroundColor: borderProgress.value > 0.5
      ? '#FFFFFF'
      : 'rgba(255, 255, 255, 0.72)',
    shadowOpacity: shadowProgress.value * 0.12,
    transform: [{ translateX: shakeX.value }],
  }));

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, typography.labelSm]}>{label}</Text>
      ) : null}

      <Animated.View
        style={[styles.inputContainer, containerAnimStyle]}
      >
        {icon ? (
          <UCIcon
            name={icon}
            size={20}
            color={hasError ? colors.error : isFocused ? colors.primary : colors.outline}
            style={styles.leadingIcon}
          />
        ) : null}

        <TextInput
          placeholderTextColor={colors.outline}
          style={[styles.input, typography.bodyMd, style]}
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            style={styles.trailingIcon}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            <UCIcon
              name={showPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color={colors.outline}
            />
          </Pressable>
        ) : null}
      </Animated.View>

      {hasError ? (
        <Text style={[styles.errorText, typography.bodySm]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hintText, typography.bodySm]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 248, 0.9)',
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 0,
  },
  input: {
    flex: 1,
    color: colors.onSurface,
    paddingVertical: 13,
    fontSize: 15,
  },
  leadingIcon: {
    marginRight: spacing.sm,
  },
  trailingIcon: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  errorText: {
    color: colors.error,
    marginTop: 5,
    fontSize: 12,
    fontWeight: '500',
  },
  hintText: {
    color: colors.outline,
    marginTop: 5,
    fontSize: 12,
  },
});
