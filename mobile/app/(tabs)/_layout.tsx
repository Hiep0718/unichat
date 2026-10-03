import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../src/design/tokens';
import { UCLiquidGlassTabBar } from '../../src/components/uc-liquid-glass-tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <UCLiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint="systemUltraThinMaterialLight"
              intensity={95}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(249, 249, 255, 0.95)' }]} />
          ),
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: 'rgba(226, 232, 248, 0.8)',
        },
        headerTitleStyle: {
          color: colors.primary,
          fontWeight: '700',
          fontSize: 18,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workspace',
          headerTitle: 'Không gian làm việc',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Hội thoại',
          headerTitle: 'Hội thoại gần đây',
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Bảng tin',
          headerTitle: 'Bảng tin cộng đồng',
          tabBarBadge: 3,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tôi',
          headerTitle: 'Tài khoản',
        }}
      />
    </Tabs>
  );
}

