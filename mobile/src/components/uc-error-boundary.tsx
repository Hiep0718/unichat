import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, radii } from '../design/tokens';
import { typography } from '../design/typography';
import { UCButton } from './uc-button';
import { UCIcon } from './uc-icon';

export interface UCErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface UCErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global Error Boundary catching render/lifecycle exceptions.
 * Adheres to UniChat design tokens and Vietnamese diacritics.
 */
export class UCErrorBoundary extends Component<UCErrorBoundaryProps, UCErrorBoundaryState> {
  constructor(props: UCErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): UCErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[UCErrorBoundary] Uncaught component error:', error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container} testID="uc-error-boundary-fallback">
          <View style={styles.iconCircle}>
            <UCIcon name="warning" size={36} color={colors.error} />
          </View>

          <Text style={styles.title}>Đã xảy ra lỗi không mong muốn</Text>
          <Text style={styles.description}>
            Ứng dụng gặp sự cố khi tải nội dung này. Bạn có thể nhấn thử lại để tiếp tục.
          </Text>

          {__DEV__ && this.state.error && (
            <ScrollView style={styles.debugBox} contentContainerStyle={styles.debugContent}>
              <Text style={styles.debugTitle}>Chi tiết kỹ thuật (DEV mode):</Text>
              <Text style={styles.debugMessage}>{this.state.error.message}</Text>
            </ScrollView>
          )}

          <View style={styles.actionWrap}>
            <UCButton
              title="Thử lại"
              variant="primary"
              size="lg"
              onPress={this.handleReset}
              testID="uc-error-boundary-retry-button"
            />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  debugBox: {
    maxHeight: 140,
    width: '100%',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  debugContent: {
    paddingBottom: spacing.sm,
  },
  debugTitle: {
    ...typography.labelSm,
    color: colors.outline,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  debugMessage: {
    ...typography.bodySm,
    color: colors.error,
    fontFamily: 'Courier',
  },
  actionWrap: {
    width: '100%',
    maxWidth: 240,
  },
});
