import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';

import { dock } from '../design/tokens';
import { UCIcon } from './uc-icon';

import type { IconName } from './uc-icon';

export type DockTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

/** Route mang nút Hỏi AI nổi ở giữa dock. */
export const AI_ROUTE = 'chat';

const ICONS: Record<string, { idle: IconName; active: IconName }> = {
  feed: { idle: 'newspaper', active: 'newspaper' },
  index: { idle: 'grid-view', active: 'grid-view' },
  messages: { idle: 'chat-bubble-outline', active: 'chat-bubble' },
  account: { idle: 'person-outline', active: 'person' },
};

/** Biểu tượng của một tab thường theo trạng thái chọn. */
export function dockIconFor(routeName: string, focused: boolean): IconName {
  const pair = ICONS[routeName];
  if (!pair) return 'folder';
  return focused ? pair.active : pair.idle;
}

function tapFeedback(): void {
  if (Platform.OS === 'ios') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

interface DockButtonProps {
  readonly routeKey: string;
  readonly routeName: string;
  readonly label: string;
  readonly focused: boolean;
  readonly badge?: number | string;
  readonly accessibilityLabel?: string;
  readonly onPress: (key: string) => void;
}

/** Một tab thường: biểu tượng, nhãn và huy hiệu nếu có. */
const DockButton = React.memo(function DockButton(props: DockButtonProps) {
  const { routeKey, routeName, label, focused, badge, accessibilityLabel, onPress } = props;
  const color = focused ? dock.iconActive : dock.icon;
  const handlePress = useCallback(() => {
    tapFeedback();
    onPress(routeKey);
  }, [onPress, routeKey]);

  return (
    <Pressable
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <View>
        <UCIcon name={dockIconFor(routeName, focused)} size={22} color={color} />
        {badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{String(badge)}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
});

/** Nút Hỏi AI: ô vuông bo tròn màu nhấn, không nhãn, nằm giữa dock. */
const AiButton = React.memo(function AiButton(props: Omit<DockButtonProps, 'routeName' | 'badge'>) {
  const { routeKey, label, focused, onPress } = props;
  const handlePress = useCallback(() => {
    tapFeedback();
    onPress(routeKey);
  }, [onPress, routeKey]);

  return (
    <View style={styles.tab}>
      <Pressable
        style={({ pressed }) => [styles.ai, focused && styles.aiFocused, pressed && styles.aiPressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={label}
        testID="dock-ai-button"
      >
        <UCIcon name="auto-awesome" size={24} color={focused ? dock.accent : dock.iconActive} />
      </Pressable>
    </View>
  );
});

/**
 * Thanh điều hướng dạng dock tối nổi ở đáy màn hình.
 *
 * Năm vị trí: Bảng tin, Nhóm, Hỏi AI ở giữa, Tin nhắn và Tài khoản. Thứ tự
 * lấy theo thứ tự khai báo `Tabs.Screen`, nên dock không giữ danh sách riêng.
 */
export function UCDockTabBar({ state, descriptors, emitter, navigateToTab, insets }: DockTabBarProps) {
  const handlePress = useCallback((routeKey: string) => {
    const index = state.routes.findIndex((route) => route.key === routeKey);
    if (index < 0) return;
    const event = emitter.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (state.index !== index && !event.defaultPrevented) navigateToTab(routeKey);
  }, [state, emitter, navigateToTab]);

  const focusedStyle = descriptors[state.routes[state.index].key]?.options.tabBarStyle;
  if ((focusedStyle as { display?: string } | undefined)?.display === 'none') return null;

  const bottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 14) : Math.max(insets.bottom + 8, 14);

  return (
    <View style={[styles.outer, { bottom }]} pointerEvents="box-none">
      <View style={styles.dock}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : options.title ?? route.name;
          const shared = { routeKey: route.key, label, focused: state.index === index, onPress: handlePress };
          if (route.name === AI_ROUTE) return <AiButton key={route.key} {...shared} />;
          return (
            <DockButton
              key={route.key}
              {...shared}
              routeName={route.name}
              badge={options.tabBarBadge as number | string | undefined}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 12, right: 12, zIndex: 999 },
  dock: {
    height: 72,
    borderRadius: 26,
    backgroundColor: dock.surface,
    borderWidth: 1,
    borderColor: dock.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 16,
  },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  label: { fontSize: 11, fontFamily: 'Inter_500Medium', color: dock.icon },
  labelActive: { fontFamily: 'Inter_700Bold', color: dock.iconActive },
  ai: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: dock.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: dock.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  // Đang ở màn Hỏi AI: nút "sáng lên" thành nền trắng viền màu nhấn, như mockup.
  aiFocused: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: dock.accent },
  aiPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: dock.badge,
    borderWidth: 1.5,
    borderColor: dock.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontFamily: 'Inter_700Bold' },
});
