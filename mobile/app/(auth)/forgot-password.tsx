import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { UCTextInput } from '../../src/components/uc-text-input';
import { UCButton } from '../../src/components/uc-button';
import { UCIcon } from '../../src/components/uc-icon';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { authApi } from '../../src/features/auth/auth-api';
import { forgotPasswordSchema, resetPasswordSchema } from '../../src/features/auth/auth-schema';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'REQUEST_OTP' | 'RESET_PASSWORD'>('REQUEST_OTP');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = async () => {
    setErrors({});
    setGeneralError(null);

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      setErrors({ email: validation.error.issues[0]?.message || 'Email không hợp lệ' });
      return;
    }

    try {
      setIsLoading(true);
      await authApi.forgotPassword({ email: email.trim() });
      setStep('RESET_PASSWORD');
    } catch (err: any) {
      setGeneralError(err.message || 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrors({});
    setGeneralError(null);

    const validation = resetPasswordSchema.safeParse({
      email,
      otp,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[String(issue.path[0])] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setIsLoading(true);
      await authApi.resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      Alert.alert(
        'Đặt lại mật khẩu thành công',
        'Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập với mật khẩu mới.',
        [{ text: 'Đăng nhập ngay', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      setGeneralError(err.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Liquid Ambient Background Orbs */}
      <View style={styles.ambientOrbCyan} />
      <View style={styles.ambientOrbNavy} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => (step === 'RESET_PASSWORD' ? setStep('REQUEST_OTP') : router.back())}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <UCIcon name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, typography.headlineXl]}>
                {step === 'REQUEST_OTP' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
              </Text>
              <Text style={[styles.subtitle, typography.bodyMd]}>
                {step === 'REQUEST_OTP'
                  ? 'Nhập email tài khoản để nhận mã OTP xác thực'
                  : `Mã OTP đã được gửi đến ${email}`}
              </Text>
            </View>

            {/* Liquid Glass Form Card */}
            <UCGlassCard variant="heavy" style={styles.glassFormCard} glow>
              {generalError ? (
                <View style={styles.errorBox}>
                  <UCIcon name="error-outline" size={18} color={colors.error} />
                  <Text style={[styles.generalErrorText, typography.bodySm]}>
                    {generalError}
                  </Text>
                </View>
              ) : null}

              {step === 'REQUEST_OTP' ? (
                <>
                  <UCTextInput
                    label="Email đã đăng ký"
                    placeholder="ten@truong.edu.vn"
                    value={email}
                    onChangeText={setEmail}
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    icon="mail-outline"
                  />

                  <UCButton
                    title="Gửi mã OTP"
                    onPress={handleRequestOtp}
                    loading={isLoading}
                    size="lg"
                    style={styles.submitBtn}
                  />
                </>
              ) : (
                <>
                  <UCTextInput
                    label="Mã OTP (6 chữ số)"
                    placeholder="123456"
                    value={otp}
                    onChangeText={setOtp}
                    error={errors.otp}
                    keyboardType="number-pad"
                    maxLength={6}
                    icon="pin"
                  />

                  <UCTextInput
                    label="Mật khẩu mới"
                    placeholder="Tối thiểu 12 ký tự"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    error={errors.newPassword}
                    isPassword
                    icon="lock-outline"
                  />

                  <UCTextInput
                    label="Xác nhận mật khẩu mới"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    error={errors.confirmPassword}
                    isPassword
                    icon="lock-outline"
                  />

                  <UCButton
                    title="Cập nhật mật khẩu"
                    onPress={handleResetPassword}
                    loading={isLoading}
                    size="lg"
                    style={styles.submitBtn}
                  />
                </>
              )}
            </UCGlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  safeArea: {
    flex: 1,
  },
  ambientOrbCyan: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(87, 223, 254, 0.25)',
  },
  ambientOrbNavy: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 35, 111, 0.12)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  glassFormCard: {
    width: '100%',
    borderRadius: 28,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  generalErrorText: {
    color: colors.onErrorContainer,
    flex: 1,
    fontWeight: '500',
  },
  submitBtn: {
    marginTop: spacing.sm,
  },
});
