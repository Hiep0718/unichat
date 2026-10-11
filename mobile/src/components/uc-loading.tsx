import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../design/tokens';
import { typography } from '../design/typography';

interface UCLoadingProps {
  message?: string;
  fullscreen?: boolean;
}

export function UCLoading({
  message = 'Đang tải dữ liệu...',
  fullscreen = false,
}: UCLoadingProps) {
  return (
    <View style={[styles.container, fullscreen ? styles.fullscreen : {}]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? (
        <Text style={[styles.message, typography.bodyMd]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  message: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
