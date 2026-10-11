import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface UCScreenContainerProps {
  children: ReactNode;
  /** Show subtle gradient mesh background instead of flat color */
  gradient?: boolean;
}

/**
 * Unified screen wrapper providing consistent liquid glass background.
 * Replaces ad-hoc `backgroundColor: '#F4F6FC'` across all tab screens.
 */
export function UCScreenContainer({
  children,
  gradient = true,
}: UCScreenContainerProps) {
  return (
    <View style={styles.container}>
      {gradient ? (
        <LinearGradient
          colors={['#F4F6FC', '#EFF3FF', '#F0F9FF', '#F4F6FC']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
});
