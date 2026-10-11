import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useBreathingScale } from '../design/animations';

interface OrbConfig {
  color: string;
  size: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  minScale: number;
  maxScale: number;
  duration: number;
}

const DEFAULT_ORBS: OrbConfig[] = [
  {
    color: 'rgba(87, 223, 254, 0.12)',
    size: 280,
    top: -80,
    right: -60,
    minScale: 1.0,
    maxScale: 1.10,
    duration: 4000,
  },
  {
    color: 'rgba(0, 35, 111, 0.05)',
    size: 340,
    top: 220,
    left: -100,
    minScale: 1.0,
    maxScale: 1.06,
    duration: 5000,
  },
  {
    color: 'rgba(0, 104, 122, 0.06)',
    size: 300,
    bottom: -60,
    right: -40,
    minScale: 1.0,
    maxScale: 1.08,
    duration: 4500,
  },
];

/**
 * Individual animated orb with breathing scale and smooth gradient falloff.
 */
function AnimatedOrb({ config }: { config: OrbConfig }) {
  const breathScale = useBreathingScale(config.minScale, config.maxScale, config.duration);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        animatedStyle,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          overflow: 'hidden',
          top: config.top,
          bottom: config.bottom,
          left: config.left,
          right: config.right,
        },
      ]}
      renderToHardwareTextureAndroid={Platform.OS === 'android'}
    >
      <LinearGradient
        colors={[config.color, 'transparent']}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

interface UCAnimatedBackgroundProps {
  orbs?: OrbConfig[];
}

/**
 * Ambient floating orbs background with breathing scale animations.
 * Used primarily on auth screens for a living, dynamic atmosphere.
 * Each orb runs an independent Reanimated loop on the UI thread.
 */
export function UCAnimatedBackground({ orbs = DEFAULT_ORBS }: UCAnimatedBackgroundProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {orbs.map((orb, index) => (
        <AnimatedOrb key={index} config={orb} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
  },
});
