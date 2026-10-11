import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { z } from 'zod';
import { colors, spacing, radii } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { UCScreenContainer } from '../../src/components/uc-screen-container';
import { UCTextInput } from '../../src/components/uc-text-input';
import { UCButton } from '../../src/components/uc-button';
import { useToast } from '../../src/lib/toast-context';
import { fetchJson } from '../../src/lib/api-client';

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(12, 'Mật khẩu hiện tại phải từ 12 ký tự trở lên'),
    newPassword: z
      .string()
      .min(12, 'Mật khẩu mới phải từ 12 ký tự trở lên')
      .max(128, 'Mật khẩu không được vượt quá 128 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export default function ChangePasswordScreen() {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleSubmit = async () => {
    setErrors({});
    const validation = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      } = {};
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field === 'currentPassword') fieldErrors.currentPassword = issue.message;
        if (field === 'newPassword') fieldErrors.newPassword = issue.message;
        if (field === 'confirmPassword') fieldErrors.confirmPassword = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setLoading(true);
      await fetchJson('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      showToast({
        message: 'Đổi mật khẩu thành công!',
        type: 'success',
      });
      router.back();
    } catch (err: any) {
      showToast({
        message: err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UCScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Cập nhật Mật khẩu</Text>
            <Text style={styles.subtitle}>
              Mật khẩu mới yêu cầu độ dài từ 12 đến 128 ký tự để bảo vệ tài khoản của bạn.
            </Text>

            <UCTextInput
              label="Mật khẩu hiện tại *"
              placeholder="Nhập mật khẩu hiện tại"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              error={errors.currentPassword}
            />

            <UCTextInput
              label="Mật khẩu mới *"
              placeholder="Tối thiểu 12 ký tự"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              error={errors.newPassword}
            />

            <UCTextInput
              label="Xác nhận mật khẩu mới *"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <View style={styles.btnWrap}>
              <UCButton
                title="Lưu mật khẩu mới"
                variant="primary"
                size="lg"
                onPress={handleSubmit}
                loading={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 60 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii['2xl'],
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  title: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  btnWrap: {
    marginTop: spacing.lg,
  },
});
