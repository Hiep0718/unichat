import { Stack } from 'expo-router';
import { colors } from '../../src/design/tokens';

export default function WorkspaceLayout() {
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
        name="[id]/index"
        options={{
          // Màn này tự vẽ dải bìa mang tên nhóm, số liệu và nút quay lại, và
          // dải đó chạy hẳn lên dưới thanh trạng thái. Một thanh tiêu đề nữa ở
          // trên chỉ chen vào giữa.
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/conversations"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/chat/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/chat/[conversationId]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
