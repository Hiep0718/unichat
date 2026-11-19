import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { workplace, palette } from '../design/tokens';

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
        colors={[palette.beMat, palette.nhanNhat, '#F0F9FF', palette.beMat]}
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
    backgroundColor: palette.beMat,
  },
  canvas: {
    flex: 1,
    backgroundColor: workplace.canvas,
  },
});
