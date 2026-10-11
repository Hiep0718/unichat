import { ReactNode, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  FadeInUp,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { glass, radii, spacing } from '../design/tokens';
import { shadows } from '../design/shadows';
import { useMicroBounce } from '../design/animations';

export type GlassVariant = 'light' | 'heavy' | 'navy' | 'teal';
export type GlassEntering = 'fade' | 'slide' | 'none';

export interface UCGlassCardProps {
  children: ReactNode;
  variant?: GlassVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
  /** Entrance animation type */
  entering?: GlassEntering;
  /** Stagger index for entrance delay */
  enteringIndex?: number;
}

/**
 * Modern iOS Liquid Glass Card Component.
 * Implements Apple-style glassmorphism with specular border highlights,
 * diffuse ambient shadows, micro-bounce press interaction,
 * and translucent frosted depth via native UIBlurView.
 */
export function UCGlassCard({
  children,
  variant = 'light',
  onPress,
  style,
  contentStyle,
  glow = false,
  entering = 'none',
  enteringIndex = 0,
}: UCGlassCardProps) {
  const { scale, pressIn, pressOut } = useMicroBounce(0.97);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (onPress) pressIn();
  }, [onPress, pressIn]);

  const handlePressOut = useCallback(() => {
    if (onPress) pressOut();
  }, [onPress, pressOut]);

  const containerStyles: StyleProp<ViewStyle> = [
    styles.base,
    styles[variant],
    glow && styles.glow,
    style,
  ];

  const enteringAnimation = entering === 'slide'
    ? FadeInUp.delay(enteringIndex * 60).springify().damping(18).stiffness(180)
    : entering === 'fade'
    ? FadeInUp.delay(enteringIndex * 60).duration(280)
    : undefined;

  const content = (
    <>
      {/* Native iOS UIBlurView for authentic optical frosted glass refraction */}
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={variant === 'heavy' ? 80 : 50}
          tint={variant === 'navy' ? 'dark' : 'systemThinMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Specular top light highlight for authentic iOS liquid glass depth */}
      <View
        style={[
          styles.specularHighlight,
          variant === 'navy'
            ? styles.specularNavy
            : variant === 'teal'
            ? styles.specularTeal
            : styles.specularLight,
        ]}
      />
      <View style={[styles.innerContent, contentStyle]}>{children}</View>
    </>
  );

  const wrappedContent = onPress ? (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={containerStyles}
    >
      <Animated.View style={animatedScale}>
        {content}
      </Animated.View>
    </Pressable>
  ) : (
    <View style={containerStyles}>{content}</View>
  );

  if (enteringAnimation) {
    return (
      <Animated.View entering={enteringAnimation}>
        {wrappedContent}
      </Animated.View>
    );
  }

  return wrappedContent;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    position: 'relative',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.2,
    zIndex: 1,
  },
  specularLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  specularNavy: {
    backgroundColor: 'rgba(182, 196, 255, 0.55)',
  },
  specularTeal: {
    backgroundColor: 'rgba(172, 237, 255, 0.55)',
  },
  innerContent: {
    padding: spacing.md,
    zIndex: 2,
  },
  light: {
    backgroundColor: glass.surface,
    borderWidth: 1.2,
    borderColor: glass.border,
    ...shadows.glass,
  },
  heavy: {
    backgroundColor: glass.surfaceHeavy,
    borderWidth: 1.2,
    borderColor: glass.border,
    ...shadows.glassFloating,
  },
  navy: {
    backgroundColor: glass.surfaceNavy,
    borderWidth: 1.2,
    borderColor: glass.borderNavy,
    ...shadows.ambientNavy,
  },
  teal: {
    backgroundColor: glass.surfaceTeal,
    borderWidth: 1.2,
    borderColor: 'rgba(172, 237, 255, 0.35)',
    ...shadows.ambientTeal,
  },
  glow: {
    ...shadows.glassGlow,
  },
});
