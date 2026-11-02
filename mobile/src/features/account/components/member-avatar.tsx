import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { avatarSource } from '../account-api';
import { avatarPaint } from '../avatar-colours';

import type { AvatarColorKey } from '../avatar-colours';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';

interface MemberAvatarProps {
  /** Tên để lấy chữ cái và, khi chưa chọn màu, để suy ra màu. */
  readonly name: string;
  readonly size: number;
  /** Người có ảnh; thiếu id thì bỏ qua việc gọi mạng. */
  readonly userId?: string;
  readonly hasAvatar?: boolean;
  readonly avatarColor?: AvatarColorKey | null;
  /** Tăng lên để buộc tải lại ảnh sau khi người dùng vừa đổi. */
  readonly version?: number;
  readonly style?: StyleProp<ViewStyle>;
}

/**
 * Avatar của một thành viên: ảnh đã tải lên, nếu không thì chữ cái trên nền màu.
 *
 * Chữ cái là mặc định chứ không phải chỗ trống chờ thay, nên khi ảnh hỏng thì
 * rơi về chữ cái chứ không để lại một ô trống.
 */
export function MemberAvatar({
  name,
  size,
  userId,
  hasAvatar = false,
  avatarColor = null,
  version = 0,
  style,
}: MemberAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Ảnh mới sau khi tải lên phải được thử lại, kể cả khi lần trước đã hỏng.
  useEffect(() => setFailed(false), [userId, version, hasAvatar]);

  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (userId && hasAvatar && !failed) {
    return (
      <Image
        accessibilityIgnoresInvertColors
        source={avatarSource(userId, version)}
        // ImageStyle và ViewStyle chỉ lệch nhau ở `overflow`, thứ không nhánh
        // nào ở đây đặt; một kiểu prop chung cho cả hai nhánh thì không viết
        // được mà không bỏ mất những thuộc tính nơi gọi đang dùng.
        style={[shape, style as StyleProp<ImageStyle>]}
        onError={() => setFailed(true)}
      />
    );
  }

  const trimmed = name.trim();
  const letter = trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  const paint = avatarPaint(trimmed || '?', avatarColor);

  return (
    <View style={[styles.letter, shape, { backgroundColor: paint.bg }, style]}>
      <Text
        allowFontScaling={false}
        style={[styles.letterText, { color: paint.ink, fontSize: Math.round(size * 0.44) }]}
      >
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  letter: { alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: 'Inter_700Bold' },
});
