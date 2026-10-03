import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { colors } from '../design/tokens';
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
 * UCLiquidGlassTabBar
 *
 * An authentic Apple iOS Liquid Glass floating dock navigation bar.
 * Features:
 * - Suspended frosted glass island with native UIBlurView
 * - Specular reflection highlight on the curved glass border
 * - Smooth physics-driven sliding indicator capsule that glides between tabs
 * - Tactile micro-bounce scale animations on press
 * - Native iOS light haptic impact on tab selection
 * - Safe area aware, floating gracefully above the home indicator
 */
export function UCLiquidGlassTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: LiquidGlassTabBarProps) {
  const [dockWidth, setDockWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const tabScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const tabCount = state.routes.length;
  const tabSlotWidth = dockWidth > 0 && tabCount > 0 ? dockWidth / tabCount : 0;

  // Animate sliding capsule whenever active tab changes
  useEffect(() => {
    if (tabSlotWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: state.index * tabSlotWidth,
        damping: 18,
        stiffness: 200,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, tabSlotWidth, slideAnim]);

  // Check if current screen requests tab bar to be hidden
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  if (
    focusedOptions?.tabBarStyle &&
    (focusedOptions.tabBarStyle as { display?: string }).display === 'none'
  ) {
    return null;
  }


  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== dockWidth) {
      setDockWidth(width);
      slideAnim.setValue(state.index * (width / tabCount));
    }
  };

  const handlePress = (routeKey: string, routeName: string, index: number) => {
    const isFocused = state.index === index;

    // Bounce scale animation
    Animated.sequence([
      Animated.timing(tabScales[index], {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(tabScales[index], {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const bottomMargin =
    Platform.OS === 'ios'
      ? Math.max(insets.bottom, 14)
      : Math.max(insets.bottom + 8, 14);

  return (
    <View style={[styles.outerContainer, { bottom: bottomMargin }]} pointerEvents="box-none">
      <View style={styles.shadowWrapper}>
        <View style={styles.glassContainer} onLayout={handleLayout}>
          {/* Native iOS Optical Blur Layer */}
          {Platform.OS === 'ios' ? (
            <BlurView
              tint="systemUltraThinMaterialLight"
              intensity={90}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
          )}

          {/* Top Edge Specular Highlight (physical glass reflection) */}
          <View style={styles.specularTopLine} />

          {/* Sliding Liquid Glass Capsule Indicator */}
          {tabSlotWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingPill,
                {
                  width: tabSlotWidth - 8,
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            />
          )}

          {/* Tab Buttons */}
          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const label = getTabLabel(
                route.name,
                typeof options.tabBarLabel === 'string'
                  ? options.tabBarLabel
                  : options.title
              );
              const iconName = getTabIcon(route.name, isFocused);
              const iconColor = isFocused ? colors.primary : '#64748B';
              const scale = tabScales[index] || 1;

              return (
                <TouchableOpacity
                  key={route.key}
                  style={styles.tabButton}
                  onPress={() => handlePress(route.key, route.name, index)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel || label}
                >
                  <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
                    <View style={styles.iconWrap}>
                      <UCIcon name={iconName} size={22} color={iconColor} />
                      {options.tabBarBadge !== undefined && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {String(options.tabBarBadge)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[styles.tabLabel, isFocused && styles.tabLabelFocused]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>

                    {/* Subtle illuminated dot for focused tab */}
                    <View
                      style={[
                        styles.focusDot,
                        isFocused && styles.focusDotActive,
                      ]}
                    />
                  </Animated.View>
                </TouchableOpacity>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  glassContainer: {
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.94)',
    justifyContent: 'center',
  },
  androidFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  specularTopLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  slidingPill: {
    position: 'absolute',
    left: 4,
    top: 6,
    bottom: 6,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
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
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  tabLabelFocused: {
    fontWeight: '700',
    color: colors.primary,
  },
  focusDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 2,
  },
  focusDotActive: {
    backgroundColor: '#00687A',
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
    fontWeight: '700',
  },
});
