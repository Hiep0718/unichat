import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii } from '../design/tokens';
import { typography } from '../design/typography';
import { shadows } from '../design/shadows';
import { UCIcon, IconName } from './uc-icon';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

interface UCToastProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const toastConfig: Record<
  ToastMessage['type'],
  { icon: IconName; bg: string; border: string; text: string; iconColor: string }
> = {
  success: {
    icon: 'check',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    iconColor: '#059669',
  },
  error: {
    icon: 'error',
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#991B1B',
    iconColor: colors.error,
  },
  warning: {
    icon: 'warning',
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    iconColor: colors.warning,
  },
  info: {
    icon: 'info',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1E40AF',
    iconColor: colors.primary,
  },
};

export function UCToast({ toast, onDismiss }: UCToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const cfg = toastConfig[toast.type] || toastConfig.info;

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 200 });

    const timer = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 });
      setTimeout(onDismiss, 250);
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    translateY.value = withTiming(-80, { duration: 150 });
    opacity.value = withTiming(0, { duration: 150 });
    setTimeout(onDismiss, 150);
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: Math.max(insets.top, 16) + spacing.sm },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={[
          styles.container,
          { backgroundColor: cfg.bg, borderColor: cfg.border },
          shadows.md,
        ]}
        onPress={handlePress}
        testID="uc-toast-card"
      >
        <View style={styles.iconBox}>
          <UCIcon name={cfg.icon} size={20} color={cfg.iconColor} />
        </View>
        <Text style={[styles.message, { color: cfg.text }]} numberOfLines={3}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    ...typography.bodyMd,
    flex: 1,
    fontWeight: '500',
  },
});
