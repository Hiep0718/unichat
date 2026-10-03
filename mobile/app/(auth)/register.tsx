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
import { colors, spacing, radii } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { UCTextInput } from '../../src/components/uc-text-input';
import { UCButton } from '../../src/components/uc-button';
import { UCIcon } from '../../src/components/uc-icon';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { authApi } from '../../src/features/auth/auth-api';
import { registerSchema } from '../../src/features/auth/auth-schema';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setErrors({});
    setGeneralError(null);

    const validation = registerSchema.safeParse({ email, password, confirmPassword });
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
      await authApi.register({
        email: email.trim(),
        password,
      });

      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập để bắt đầu.',
        [{ text: 'Đăng nhập ngay', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      setGeneralError(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.');
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
            {/* Header */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <UCIcon name="arrow-back" size={22} color={colors.primary} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, typography.headlineXl]}>Tạo tài khoản</Text>
              <Text style={[styles.subtitle, typography.bodyMd]}>
                Khám phá kho tri thức và hỏi đáp AI học thuật thông minh
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

              <UCTextInput
                label="Email trường hoặc cá nhân"
                placeholder="ten@truong.edu.vn"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                icon="mail-outline"
              />

              <UCTextInput
                label="Mật khẩu"
                placeholder="Tối thiểu 12 ký tự"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                isPassword
                hint="Tối thiểu 12 ký tự gồm chữ và số"
                icon="lock-outline"
              />

              <UCTextInput
                label="Xác nhận mật khẩu"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                error={errors.confirmPassword}
                isPassword
                icon="lock-outline"
              />

              <UCButton
                title="Đăng ký tài khoản"
                onPress={handleRegister}
                loading={isLoading}
                size="lg"
                style={styles.submitBtn}
              />
            </UCGlassCard>

            <View style={styles.footerLinkContainer}>
              <Text style={[styles.footerText, typography.bodyMd]}>
                Đã có tài khoản?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.7}
              >
                <Text style={[styles.signInText, typography.labelMd]}>
                  Đăng nhập
                </Text>
              </TouchableOpacity>
            </View>
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
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(87, 223, 254, 0.25)',
  },
  ambientOrbNavy: {
    position: 'absolute',
    bottom: -80,
    right: -60,
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
  footerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    color: colors.onSurfaceVariant,
  },
  signInText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
