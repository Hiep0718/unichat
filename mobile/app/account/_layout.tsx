import { Stack } from 'expo-router';
import { colors } from '../../src/design/tokens';

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.surface,
        },
      }}
    >
      <Stack.Screen
        name="change-password"
        options={{
          title: 'Đổi mật khẩu',
          headerBackTitle: 'Tài khoản',
        }}
      />
    </Stack>
  );
}
