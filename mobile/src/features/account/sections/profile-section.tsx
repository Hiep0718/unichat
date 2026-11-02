import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { colors } from '../../../design/tokens';
import { accountApi } from '../account-api';
import { AccountSection } from '../components/account-section';
import { AvatarPicker } from '../components/avatar-picker';
import { toAvatarColorKey } from '../avatar-colours';

import type { UserResponse } from '../../../types/api';

/** Trùng `User.MAX_DISPLAY_NAME` của Core API. */
const MAX_DISPLAY_NAME = 50;

interface ProfileSectionProps {
  readonly profile: UserResponse;
  /** Gọi sau mỗi thay đổi đã lưu, để nơi gọi tải lại hồ sơ. */
  readonly onChanged: () => void;
}

/**
 * Khu vực "Hồ sơ": ảnh đại diện, tên hiển thị và email.
 *
 * Vai trò hệ thống không hiện ở đây: người dùng không đổi được nó, và thứ
 * quyết định họ làm được gì là quyền trên từng nhóm chứ không phải dòng chữ
 * "USER". Email chỉ đọc vì nó gắn với tài khoản tổ chức.
 */
export function ProfileSection({ profile, onChanged }: ProfileSectionProps) {
  // null nghĩa là "chưa sửa", nên ô vẫn bám theo hồ sơ vừa tải về cho tới khi
  // người dùng thật sự gõ gì đó.
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; bad: boolean } | null>(null);

  const saved = profile.displayName ?? '';
  const name = draft ?? saved;
  const changed = name.trim().length > 0 && name.trim() !== saved;
  const handle = profile.email.split('@')[0] ?? '';

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await accountApi.updateDisplayName(name.trim());
      setDraft(null);
      setStatus({ text: 'Đã lưu tên hiển thị.', bad: false });
      onChanged();
    } catch (cause: unknown) {
      const text = cause instanceof Error ? cause.message : 'Không lưu được tên. Vui lòng thử lại.';
      setStatus({ text, bad: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountSection title="Hồ sơ">
      <AvatarPicker
        avatarColor={toAvatarColorKey(profile.avatarColor)}
        hasAvatar={profile.hasAvatar ?? false}
        onChanged={onChanged}
      />

      <Text style={styles.label}>Tên hiển thị</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={name}
          maxLength={MAX_DISPLAY_NAME}
          onChangeText={(value) => {
            setDraft(value);
            setStatus(null);
          }}
          editable={!saving}
          accessibilityLabel="Tên hiển thị"
          placeholder="Tên bạn muốn người khác thấy"
          placeholderTextColor="#94A3B8"
        />
        {changed ? (
          <Pressable
            style={styles.save}
            onPress={() => void save()}
            disabled={saving}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>Lưu</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      <Text
        style={[styles.hint, status?.bad ? styles.hintBad : null]}
        accessibilityLiveRegion="polite"
      >
        {status?.text ?? `Người khác vẫn nhắc bạn bằng @${handle}.`}
      </Text>

      <Text style={[styles.label, styles.emailLabel]}>Email</Text>
      <View style={styles.emailRow}>
        <Text style={styles.emailValue} numberOfLines={1}>
          {profile.email}
        </Text>
        <UCIcon name="lock-outline" size={17} color="#94A3B8" />
      </View>
      <Text style={styles.hint}>Email gắn với tài khoản tổ chức nên không đổi trực tiếp được.</Text>
    </AccountSection>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#334155',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginTop: 18,
    marginBottom: 8,
  },
  emailLabel: { marginTop: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: '#0F172A',
    fontFamily: 'Inter_400Regular',
    fontSize: 14.5,
  },
  save: {
    height: 48,
    minWidth: 66,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  saveText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 13.5 },
  hint: { color: '#94A3B8', fontFamily: 'Inter_400Regular', fontSize: 11.5, marginTop: 8 },
  hintBad: { color: '#DC2626' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emailValue: { flex: 1, color: '#64748B', fontFamily: 'Inter_400Regular', fontSize: 13.5 },
});
