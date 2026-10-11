import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { colors, glass, animation } from '../design/tokens';
import { UCIcon, IconName } from './uc-icon';

export type LiquidGlassTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>
>[0];

/**
 * Returns the appropriate icon name for a given tab route.
 */
function getTabIcon(routeName: string, focused: boolean): IconName {
  switch (routeName) {
    case 'index':
      return 'home';
    case 'chat':
      return focused ? 'chat' : 'chat-bubble-outline';
    case 'feed':
      return 'dynamic-feed';
    case 'account':
      return focused ? 'person' : 'person-outline';
    default:
      return 'folder';
  }
}

/**
 * Returns the localized label for a tab.
 */
function getTabLabel(routeName: string, rawTitle?: string): string {
  if (rawTitle) return rawTitle;
  switch (routeName) {
    case 'index':
      return 'Workspace';
    case 'chat':
      return 'Hội thoại';
    case 'feed':
      return 'Bảng tin';
    case 'account':
      return 'Tôi';
    default:
      return routeName;
  }
}

/**
 * Individual tab button with Reanimated micro-interactions.
 */
const TabButton = React.memo(function TabButton({
  routeKey,
  routeName,
  title,
  isFocused,
  tabBarBadge,
  accessibilityLabel,
  onPress,
}: {
  routeKey: string;
  routeName: string;
  title?: string;
  isFocused: boolean;
  tabBarBadge?: number | string;
  accessibilityLabel?: string;
  onPress: (key: string, name: string) => void;
}) {
  const scale = useSharedValue(1);
  const floatY = useSharedValue(0);
  const labelOpacity = useSharedValue(isFocused ? 1 : 0.7);
  const dotScale = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    labelOpacity.value = withTiming(
      isFocused ? 1 : 0.7,
      { duration: animation.durationMedium },
    );
    floatY.value = withSpring(
      isFocused ? -1.5 : 0,
      animation.springSmooth,
    );
    dotScale.value = withSpring(
      isFocused ? 1 : 0,
      animation.springBouncy,
    );
  }, [isFocused, labelOpacity, floatY, dotScale]);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.88, { duration: 80 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animation.springBouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress(routeKey, routeName);
  }, [routeKey, routeName, onPress]);

  const label = getTabLabel(routeName, title);
  const iconName = getTabIcon(routeName, isFocused);
  const iconColor = isFocused ? colors.primary : '#64748B';

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: floatY.value },
    ],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  return (
    <Pressable
      style={styles.tabButton}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel || label}
    >
      <Animated.View style={[styles.tabContent, iconAnimatedStyle]}>
        <View style={styles.iconWrap}>
          <UCIcon name={iconName} size={22} color={iconColor} />
          {tabBarBadge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {String(tabBarBadge)}
              </Text>
            </View>
          )}
        </View>

        <Animated.Text
          style={[
            styles.tabLabel,
            isFocused && styles.tabLabelFocused,
            labelAnimatedStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>

        <Animated.View
          style={[styles.focusDot, dotAnimatedStyle]}
        />
      </Animated.View>
    </Pressable>
  );
});

/**
 * UCLiquidGlassTabBar
 *
 * Authentic Liquid Glass floating dock with Reanimated animations.
 * Features:
 * - Multi-layer frosted glass capsule with gradient refraction
 * - Physics-driven sliding indicator with inner glow border
 * - Micro-bounce icon float-up on selection
 * - iOS light haptic impact on tab switch
 * - Animated shimmer specular highlight sweep
 */
export function UCLiquidGlassTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: LiquidGlassTabBarProps) {
  const dockWidth = useSharedValue(0);
  const capsuleX = useSharedValue(0);

  const tabCount = state.routes.length;

  useEffect(() => {
    if (dockWidth.value > 0 && tabCount > 0) {
      const slotWidth = dockWidth.value / tabCount;
      capsuleX.value = withSpring(
        state.index * slotWidth,
        { damping: 20, stiffness: 240, mass: 0.75 },
      );
    }
  }, [state.index, tabCount, capsuleX, dockWidth]);

  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  if (
    focusedOptions?.tabBarStyle &&
    (focusedOptions.tabBarStyle as { display?: string }).display === 'none'
  ) {
    return null;
  }

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      dockWidth.value = width;
      capsuleX.value = state.index * (width / tabCount);
    }
  }, [dockWidth, capsuleX, state.index, tabCount]);

  const handleTabPress = useCallback((routeKey: string, routeName: string) => {
    const route = state.routes.find((r) => r.key === routeKey);
    if (!route) return;

    const index = state.routes.indexOf(route);
    const isFocused = state.index === index;

    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  }, [state, navigation]);

  const capsuleStyle = useAnimatedStyle(() => {
    const slotWidth = tabCount > 0 ? dockWidth.value / tabCount : 0;
    return {
      width: slotWidth > 8 ? slotWidth - 8 : 0,
      transform: [{ translateX: capsuleX.value }],
    };
  });

  const bottomMargin = useMemo(() => (
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 14)
      : Math.max(insets.bottom + 8, 14)
  ), [insets.bottom]);

  return (
    <View style={[styles.outerContainer, { bottom: bottomMargin }]} pointerEvents="box-none">
      <View style={styles.shadowWrapper}>
        <View style={styles.glassContainer} onLayout={handleLayout}>
          {/* Native Frosted Glass Layer */}
          {Platform.OS === 'ios' ? (
            <BlurView
              tint="systemChromeMaterial"
              intensity={85}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <LinearGradient
              colors={['rgba(255,255,255,0.96)', 'rgba(240,243,255,0.94)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Top Edge Specular Highlight */}
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.95)',
              'rgba(255,255,255,0.4)',
              'rgba(255,255,255,0.0)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.specularTopLine}
          />

          {/* Multi-Layer Sliding Capsule */}
          <Animated.View style={[styles.slidingPillOuter, capsuleStyle]}>
            {/* Inner frosted refraction */}
            {Platform.OS === 'ios' ? (
              <BlurView
                tint="systemUltraThinMaterialLight"
                intensity={40}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {/* Gradient refraction overlay */}
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.90)',
                'rgba(255,255,255,0.55)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Inner glow border */}
            <View style={styles.capsuleInnerGlow} />
          </Animated.View>

          {/* Tab Buttons */}
          <View style={styles.tabsRow}>
            {state.routes.map((route) => {
              const { options } = descriptors[route.key];
              const index = state.routes.indexOf(route);
              const isFocused = state.index === index;

              return (
                <TabButton
                  key={route.key}
                  routeKey={route.key}
                  routeName={route.name}
                  title={
                    typeof options.tabBarLabel === 'string'
                      ? options.tabBarLabel
                      : options.title
                  }
                  isFocused={isFocused}
                  tabBarBadge={options.tabBarBadge as number | string | undefined}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={handleTabPress}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  shadowWrapper: {
    shadowColor: '#001A52',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
  glassContainer: {
    height: 64,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.80)',
    backgroundColor: Platform.OS === 'ios'
      ? 'transparent'
      : 'rgba(255, 255, 255, 0.96)',
    justifyContent: 'center',
  },
  specularTopLine: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    zIndex: 1,
  },
  slidingPillOuter: {
    position: 'absolute',
    left: 4,
    top: 5,
    bottom: 5,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: Platform.OS === 'ios'
      ? 'transparent'
      : 'rgba(255, 255, 255, 0.80)',
  },
  capsuleInnerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: glass.innerGlow,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    zIndex: 2,
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10.5,
    fontFamily: 'Inter_500Medium',
    color: '#64748B',
    marginTop: 1,
  },
  tabLabelFocused: {
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
  },
  focusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00687A',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -10,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
});
