import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/design/tokens';
import { UCDockTabBar } from '../../src/components/uc-dock-tab-bar';
import { totalUnread } from '../../src/features/messages/conversation-presenter';
import { useConversations } from '../../src/features/messages/use-conversations';

/**
 * Bảng tin đứng đầu dock nhưng Nhóm vẫn là màn mở đầu sau khi đăng nhập, nên
 * tab mặc định được nêu rõ thay vì để trình điều hướng lấy tab đầu tiên.
 */
export const unstable_settings = { initialRouteName: 'index' };

/** Huy hiệu không vượt hai chữ số, để không đẩy lệch nhãn bên dưới. */
function unreadBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : String(count);
}

/**
 * Tab layout: Bảng tin, Nhóm, Hỏi AI ở giữa, Tin nhắn và Tài khoản trên một
 * dock tối nổi ở đáy.
 */
export default function TabLayout() {
  const { data: conversations } = useConversations();
  const messagesBadge = unreadBadge(totalUnread(conversations));

  return (
    <Tabs
      tabBar={(props) => <UCDockTabBar {...props} />}
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
        name="feed"
        options={{
          title: 'Bảng tin',
          // Hàng bộ lọc đã nói rõ đây là bảng tin; một thanh tiêu đề nữa chỉ
          // tốn chỗ trên màn hẹp.
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Nhóm',
          // Dải chào của màn này đã mang thương hiệu, ngày và lời chào, và nó
          // chạy hẳn lên dưới thanh trạng thái. Một thanh "Không gian làm việc"
          // nữa ở trên chỉ chen vào giữa, nên tắt riêng cho tab này.
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Hỏi AI',
          // Màn này tự vẽ dải đầu tối "Trợ lý AI" chạy dưới thanh trạng thái.
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Tin nhắn',
          tabBarBadge: messagesBadge,
          // Màn này tự vẽ tiêu đề lớn "Tin nhắn" cùng các nút hành động.
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Tài khoản',
          headerTitle: 'Tài khoản',
          // Màn hình này tự vẽ dải đầu mang tiêu đề; để header của trình điều
          // hướng bật nữa thì chữ "Tài khoản" hiện hai lần chồng nhau.
          headerShown: false,
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
