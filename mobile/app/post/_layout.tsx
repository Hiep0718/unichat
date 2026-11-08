import { Stack } from 'expo-router';

import { workplace } from '../../src/design/tokens';

/** Ngăn xếp của màn chi tiết bài viết; màn tự vẽ dải đầu. */
export default function PostLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: workplace.canvas } }} />;
}
