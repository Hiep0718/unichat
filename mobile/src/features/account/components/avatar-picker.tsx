import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { UCIcon } from '../../../components/uc-icon';
import { colors } from '../../../design/tokens';
import { AVATAR_ACCEPTED_TYPES, AVATAR_MAX_BYTES, accountApi } from '../account-api';
import { AVATAR_COLOURS, AVATAR_COLOR_KEYS, AVATAR_COLOR_LABELS } from '../avatar-colours';

import type { AvatarColorKey } from '../avatar-colours';

const DEFAULT_HINT = 'PNG, JPEG hoặc WebP, tối đa 2 MiB. Ảnh sẽ được cắt vuông.';

interface AvatarPickerProps {
  readonly avatarColor: AvatarColorKey | null;
  readonly hasAvatar: boolean;
  /** Gọi sau mỗi thay đổi, để nơi gọi tải lại hồ sơ. */
  readonly onChanged: () => void;
}

/**
 * Chọn ảnh đại diện, hoặc một màu thay cho ảnh.
 *
 * Dùng `expo-document-picker` lọc theo kiểu ảnh thay vì thư viện chọn ảnh
 * riêng, để không thêm phụ thuộc mới vào ứng dụng.
 */
export function AvatarPicker({ avatarColor, hasAvatar, onChanged }: AvatarPickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    async (change: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await change();
        onChanged();
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : 'Không lưu được thay đổi.');
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  const pickImage = useCallback(async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [...AVATAR_ACCEPTED_TYPES],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.length) return;

    const file = picked.assets[0];
    if (file.size != null && file.size > AVATAR_MAX_BYTES) {
      setError('Ảnh vượt quá 2 MiB. Hãy chọn ảnh nhỏ hơn.');
      return;
    }
    await apply(() =>
      accountApi.uploadAvatar({
        uri: file.uri,
        name: file.name || 'avatar.png',
        type: file.mimeType || 'image/png',
      }),
    );
  }, [apply]);

  return (
    <View>
      <Text style={styles.label}>Ảnh đại diện</Text>

      <View style={styles.row}>
        <Pressable
          style={[styles.slot, styles.upload]}
          onPress={() => void pickImage()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={hasAvatar ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện lên'}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <UCIcon name="photo-camera" size={17} color="#64748B" />
          )}
        </Pressable>

        {AVATAR_COLOR_KEYS.map((key) => (
          <Swatch
            key={key}
            colour={AVATAR_COLOURS[key].bg}
            label={AVATAR_COLOR_LABELS[key]}
            selected={avatarColor === key}
            disabled={busy}
            onPress={() => void apply(() => accountApi.chooseAvatarColor(key))}
          />
        ))}

        <Swatch
          colour="#0F172A"
          label="Màu tự động theo tên"
          selected={avatarColor === null}
          disabled={busy}
          onPress={() => void apply(() => accountApi.chooseAvatarColor(null))}
        />
      </View>

      {hasAvatar ? (
        <Pressable
          onPress={() => void apply(accountApi.removeAvatar)}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.removeText}>Gỡ ảnh, dùng chữ cái</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.hint, error ? styles.hintBad : null]} accessibilityLiveRegion="polite">
        {error ?? DEFAULT_HINT}
      </Text>
    </View>
  );
}

interface SwatchProps {
  readonly colour: string;
  readonly label: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onPress: () => void;
}

/** Một ô màu; vòng ngoài chỉ hiện ở ô đang chọn. */
function Swatch({ colour, label, selected, disabled, onPress }: SwatchProps) {
  return (
    <Pressable
      style={[styles.slot, selected && styles.slotSelected]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      <View style={[styles.dot, { backgroundColor: colour }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#334155',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  slot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  slotSelected: { borderColor: colors.primary },
  upload: {
    borderWidth: 1.4,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
  },
  dot: { width: 28, height: 28, borderRadius: 14 },
  removeText: {
    color: '#64748B',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    marginTop: 12,
  },
  hint: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 11.5, marginTop: 10 },
  hintBad: { color: '#DC2626' },
});
