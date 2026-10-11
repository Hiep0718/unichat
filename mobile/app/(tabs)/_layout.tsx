import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/design/tokens';
import { UCLiquidGlassTabBar } from '../../src/components/uc-liquid-glass-tab-bar';

/**
 * Tab layout with liquid glass header and floating dock navigation.
 */
export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <UCLiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        headerBackground: () =>
          Platform.OS === 'ios' ? (
            <View style={StyleSheet.absoluteFill}>
              <BlurView
                tint="systemChromeMaterial"
                intensity={90}
                style={StyleSheet.absoluteFill}
              />
              {/* Bottom edge gradient fade for seamless blend */}
              <LinearGradient
                colors={['rgba(226,232,248,0.5)', 'rgba(226,232,248,0.0)']}
                start={{ x: 0, y: 0.8 }}
                end={{ x: 0, y: 1 }}
                style={styles.headerEdgeFade}
              />
            </View>
          ) : (
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={['rgba(249,249,255,0.98)', 'rgba(240,243,255,0.95)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ),
        headerStyle: {
          backgroundColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: 'rgba(226, 232, 248, 0.6)',
        },
        headerTitleStyle: {
          color: colors.primary,
          fontFamily: 'Inter_700Bold',
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
          headerTitle: 'Lịch sử hội thoại',
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

const styles = StyleSheet.create({
  headerEdgeFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 8,
  },
});
