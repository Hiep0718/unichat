import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../design/tokens';
import { typography } from '../design/typography';
import { UCIcon, IconName } from './uc-icon';
import { UCButton } from './uc-button';

interface UCEmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
}

export function UCEmptyState({
  icon = 'inbox',
  title,
  description,
  actionTitle,
  onAction,
}: UCEmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <UCIcon name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[styles.title, typography.headlineMd]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, typography.bodyMd]}>{description}</Text>
      ) : null}
      {actionTitle && onAction ? (
        <UCButton
          title={actionTitle}
          onPress={onAction}
          variant="outline"
          size="sm"
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    marginTop: spacing.xs,
  },
});
