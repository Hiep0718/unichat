import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/auth-context';
import { UCLoading } from '../src/components/uc-loading';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <UCLoading fullscreen message="Đang khởi động UniChat..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
