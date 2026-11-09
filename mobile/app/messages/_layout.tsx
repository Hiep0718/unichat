import { Stack } from 'expo-router';

import { messenger } from '../../src/design/tokens';

/** Ngăn xếp của luồng chat; mỗi màn tự vẽ dải đầu riêng. */
export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: messenger.canvas } }} />
  );
}
