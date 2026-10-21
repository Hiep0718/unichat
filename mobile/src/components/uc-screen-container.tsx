import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { workplace } from '../design/tokens';

/**
 * Which backdrop a screen sits on.
 *
 * `canvas` is the flat --ws-canvas the web uses, where cards carry the
 * separation themselves. `glass` is the older tinted gradient, kept so the
 * screens that have not moved over yet look no different than before.
 */
export type UCScreenSurface = 'glass' | 'canvas';

interface UCScreenContainerProps {
  children: ReactNode;
  surface?: UCScreenSurface;
}

/**
 * Unified screen wrapper giving every tab the same backdrop.
 */
export function UCScreenContainer({
  children,
  surface = 'glass',
}: UCScreenContainerProps) {
  if (surface === 'canvas') {
    return <View style={styles.canvas}>{children}</View>;
  }

  return (
    <View style={styles.glass}>
      <LinearGradient
        colors={['#F4F6FC', '#EFF3FF', '#F0F9FF', '#F4F6FC']}
        locations={[0, 0.3, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  canvas: {
    flex: 1,
    backgroundColor: workplace.canvas,
  },
});
