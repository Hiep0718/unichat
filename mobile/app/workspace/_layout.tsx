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
          title: 'Chi tiết Workspace',
          headerBackTitle: 'Quay lại',
        }}
      />
      <Stack.Screen
        name="[id]/documents"
        options={{
          title: 'Quản lý tài liệu',
          headerBackTitle: 'Workspace',
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
