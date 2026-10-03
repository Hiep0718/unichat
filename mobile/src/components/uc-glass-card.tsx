import { ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { glass, radii, spacing, colors } from '../design/tokens';
import { shadows } from '../design/shadows';

export type GlassVariant = 'light' | 'heavy' | 'navy' | 'teal';

export interface UCGlassCardProps {
  children: ReactNode;
  variant?: GlassVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  glow?: boolean;
}

/**
 * Modern iOS Liquid Glass Card Component.
 * Implements Apple-style glassmorphism with specular border highlights,
 * diffuse ambient shadows, and translucent frosted depth via native UIBlurView.
 */
export function UCGlassCard({
  children,
  variant = 'light',
  onPress,
  style,
  contentStyle,
  glow = false,
}: UCGlassCardProps) {
  const containerStyles: StyleProp<ViewStyle> = [
    styles.base,
    styles[variant],
    glow && styles.glow,
    style,
  ];

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

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        style={containerStyles}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyles}>{content}</View>;
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
    ...shadows.xl,
  },
  teal: {
    backgroundColor: glass.surfaceTeal,
    borderWidth: 1.2,
    borderColor: 'rgba(172, 237, 255, 0.35)',
    ...shadows.lg,
  },
  glow: {
    ...shadows.glassGlow,
  },
});
