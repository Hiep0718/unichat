import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { UCScreenContainer } from '../../src/components/uc-screen-container';
import { accountApi } from '../../src/features/account/account-api';
import { toAvatarColorKey } from '../../src/features/account/avatar-colours';
import { AccountHero } from '../../src/features/account/components/account-hero';
import { AppearanceSection } from '../../src/features/account/sections/appearance-section';
import { ProfileSection } from '../../src/features/account/sections/profile-section';
import { SecuritySection } from '../../src/features/account/sections/security-section';
import { useAuth } from '../../src/features/auth/auth-context';

import type { UserResponse } from '../../src/types/api';

/**
 * Màn hình Tài khoản.
 *
 * Hồ sơ đọc qua React Query chứ không chỉ lấy từ trạng thái đăng nhập, vì
 * `hasAvatar` và `avatarColor` đổi ngay trên màn hình này và phải hiện lại
 * mà không cần đăng nhập lại. Trạng thái đăng nhập vẫn là nguồn hiển thị tên
 * ở những màn khác nên được làm mới cùng lúc.
 */
export default function AccountTabScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [avatarVersion, setAvatarVersion] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: accountApi.getMe,
  });

  // Chữ sáng trên thanh trạng thái do dải đầu dùng chung (UCTabHero) lo.

  const onChanged = useCallback(() => {
    setAvatarVersion((version) => version + 1);
    void queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    void refreshProfile();
  }, [queryClient, refreshProfile]);

  const profile: UserResponse | null = data ?? user;

  return (
    <UCScreenContainer surface="canvas">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AccountHero
          displayName={displayNameOf(profile)}
          email={profile?.email ?? 'Chưa đăng nhập'}
          userId={profile?.id}
          hasAvatar={profile?.hasAvatar}
          avatarColor={toAvatarColorKey(profile?.avatarColor)}
          avatarVersion={avatarVersion}
        />

        <View style={styles.sections}>
          {profile ? (
            <ProfileSection profile={profile} onChanged={onChanged} />
          ) : (
            <PlaceholderCard loading={isLoading} failed={isError} />
          )}
          <AppearanceSection />
          <SecuritySection onLogout={() => void logout()} />
        </View>
      </ScrollView>
    </UCScreenContainer>
  );
}

/** Tên hiển thị, lùi về phần trước @ của email khi hồ sơ chưa có tên. */
function displayNameOf(profile: UserResponse | null): string {
  const named = profile?.displayName?.trim();
  if (named) return named;
  return profile?.email?.split('@')[0] ?? 'Sinh viên';
}

/** Chỗ của thẻ Hồ sơ khi chưa có dữ liệu để vẽ. */
function PlaceholderCard({ loading, failed }: { loading: boolean; failed: boolean }) {
  return (
    <View style={styles.placeholder}>
      {loading ? <ActivityIndicator size="small" color="#64748B" /> : null}
      <Text style={styles.placeholderText}>
        {failed ? 'Không tải được hồ sơ. Kéo xuống hoặc thử lại sau.' : 'Đang tải hồ sơ…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 118 },
  sections: { paddingHorizontal: 16, paddingTop: 18, gap: 16 },
  placeholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  placeholderText: { color: '#64748B', fontFamily: 'Inter_400Regular', fontSize: 13 },
});
