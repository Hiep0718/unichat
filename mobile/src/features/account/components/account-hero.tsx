import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UCTabHero } from '../../../components/uc-tab-hero';

import { MemberAvatar } from './member-avatar';

import type { AvatarColorKey } from '../avatar-colours';

interface AccountHeroProps {
  readonly displayName: string;
  readonly email: string;
  readonly userId?: string;
  readonly hasAvatar?: boolean;
  readonly avatarColor?: AvatarColorKey | null;
  readonly avatarVersion?: number;
}

/**
 * Dải đầu màn hình Tài khoản: tiêu đề, avatar, tên và email trên nền tối.
 *
 * Dải này mang luôn tiêu đề nên màn hình tắt header của trình điều hướng; nếu
 * bật cả hai thì chữ "Tài khoản" hiện hai lần chồng nhau.
 */
export function AccountHero({
  displayName,
  email,
  userId,
  hasAvatar,
  avatarColor,
  avatarVersion,
}: AccountHeroProps) {
  return (
    <UCTabHero title="Tài khoản">
      <View style={styles.identity}>
        <MemberAvatar
          name={displayName}
          size={58}
          userId={userId}
          hasAvatar={hasAvatar}
          avatarColor={avatarColor}
          version={avatarVersion}
          style={styles.avatarRing}
        />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </View>
    </UCTabHero>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  avatarRing: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)' },
  identityText: { flex: 1, marginLeft: 14 },
  name: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    letterSpacing: -0.3,
  },
  email: { color: 'rgba(226,232,248,0.66)', fontFamily: 'Inter_400Regular', fontSize: 12.5, marginTop: 3 },
});
