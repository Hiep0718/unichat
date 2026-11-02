import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={['#0A1026', '#121A3C', '#1B2255']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(99,130,255,0.35)', 'rgba(99,130,255,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <PaperStack />

      <View style={[styles.body, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title} accessibilityRole="header">
          Tài khoản
        </Text>

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
      </View>
    </View>
  );
}

/** Chồng tài liệu trang trí ở góc phải, vẽ bằng khối nên không cần ảnh. */
function PaperStack() {
  return (
    <View style={styles.paperStack} pointerEvents="none" accessibilityElementsHidden>
      <View style={[styles.sheet, styles.sheetBack]} />
      <View style={[styles.sheet, styles.sheetMid]} />
      <View style={[styles.sheet, styles.sheetFront]}>
        <View style={styles.sheetLine} />
        <View style={[styles.sheetLine, styles.sheetLineShort]} />
        <View style={styles.sheetLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0A1026',
  },
  body: { paddingHorizontal: 20, paddingBottom: 22 },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 27,
    letterSpacing: -0.6,
  },
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
  paperStack: { position: 'absolute', top: 18, right: 10, width: 128, height: 118 },
  sheet: {
    position: 'absolute',
    width: 46,
    height: 60,
    borderRadius: 7,
    backgroundColor: '#C9D2E4',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  sheetBack: { top: 0, left: 16, transform: [{ rotate: '-9deg' }], opacity: 0.55 },
  sheetMid: { top: 2, left: 54, transform: [{ rotate: '7deg' }], opacity: 0.75 },
  sheetFront: {
    top: 46,
    left: 44,
    width: 52,
    height: 66,
    backgroundColor: '#E6EBF5',
    paddingHorizontal: 8,
    paddingTop: 12,
    gap: 6,
  },
  sheetLine: { height: 3, borderRadius: 2, backgroundColor: 'rgba(90,110,160,0.45)' },
  sheetLineShort: { width: '62%' },
});
