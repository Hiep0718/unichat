import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, glass, spacing, radii } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { shadows } from '../../src/design/shadows';
import { UCTextInput } from '../../src/components/uc-text-input';
import { UCButton } from '../../src/components/uc-button';
import { UCIcon } from '../../src/components/uc-icon';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { useAuth } from '../../src/features/auth/auth-context';
import { loginSchema } from '../../src/features/auth/auth-schema';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setErrors({});
    setGeneralError(null);

    const validation = loginSchema.safeParse({ email, password });
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
      await login(email.trim(), password);
    } catch (err: any) {
      setGeneralError(err.message || 'Đăng nhập không thành công. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail('alice.expert@unichat.test');
    setPassword('Password123!');
    setErrors({});
    setGeneralError(null);
  };

  return (
    <View style={styles.root}>
      {/* Liquid Ambient Background Orbs */}
      <View style={styles.ambientOrbCyan} />
      <View style={styles.ambientOrbNavy} />
      <View style={styles.ambientOrbTeal} />

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
            {/* Brand Header */}
            <View style={styles.header}>
              <View style={styles.logoBadgeContainer}>
                <View style={styles.logoBadge}>
                  <UCIcon name="school" size={42} color="#FFFFFF" />
                  <View style={styles.logoBadgeSpecular} />
                </View>
                <View style={styles.sparkleBadge}>
                  <UCIcon name="auto-awesome" size={14} color="#57DFFE" />
                </View>
              </View>

              <Text style={[styles.brandTitle, typography.headlineXl]}>UniChat</Text>
              <Text style={[styles.brandSubtitle, typography.bodyMd]}>
                Nền tảng Tri thức Học thuật AI
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
                label="Email học thuật hoặc cá nhân"
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
                icon="lock-outline"
              />

              <View style={styles.rowBetween}>
                <TouchableOpacity
                  style={styles.demoChip}
                  onPress={fillDemoAccount}
                  activeOpacity={0.7}
                >
                  <UCIcon name="flash-on" size={14} color={colors.primary} />
                  <Text style={styles.demoChipText}>Thử tài khoản mẫu</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotPasswordLink}
                  onPress={() => router.push('/(auth)/forgot-password')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.linkText, typography.labelSm]}>
                    Quên mật khẩu?
                  </Text>
                </TouchableOpacity>
              </View>

              <UCButton
                title="Đăng nhập"
                onPress={handleLogin}
                loading={isLoading}
                size="lg"
                style={styles.submitBtn}
              />
            </UCGlassCard>

            {/* Footer */}
            <View style={styles.footerLinkContainer}>
              <Text style={[styles.footerText, typography.bodyMd]}>
                Chưa có tài khoản?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.7}
              >
                <Text style={[styles.signUpText, typography.labelMd]}>
                  Đăng ký ngay
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
  // Ambient Glowing Orbs
  ambientOrbCyan: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(87, 223, 254, 0.28)',
  },
  ambientOrbNavy: {
    position: 'absolute',
    top: 220,
    left: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 35, 111, 0.12)',
  },
  ambientOrbTeal: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 104, 122, 0.16)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBadgeContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  logoBadgeSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  sparkleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00236F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#57DFFE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  brandTitle: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: colors.onSurfaceVariant,
    marginTop: 4,
    letterSpacing: -0.2,
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  forgotPasswordLink: {
    paddingVertical: 4,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.xs,
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
  signUpText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
