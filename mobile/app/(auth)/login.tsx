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
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, spacing } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { shadows } from '../../src/design/shadows';
import { UCTextInput } from '../../src/components/uc-text-input';
import { UCButton } from '../../src/components/uc-button';
import { UCIcon } from '../../src/components/uc-icon';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { UCAnimatedBackground } from '../../src/components/uc-animated-background';
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
      {/* Animated Ambient Background Orbs */}
      <UCAnimatedBackground />

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
            <Animated.View
              entering={FadeInDown.delay(100).springify().damping(16).stiffness(140)}
              style={styles.header}
            >
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
            </Animated.View>

            {/* Liquid Glass Form Card */}
            <Animated.View entering={FadeInUp.delay(200).springify().damping(18).stiffness(160)}>
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
            </Animated.View>

            {/* Footer */}
            <Animated.View
              entering={FadeInUp.delay(350).duration(280)}
              style={styles.footerLinkContainer}
            >
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
            </Animated.View>
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
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    ...shadows.ambientNavy,
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
    ...shadows.ambientCyan,
  },
  brandTitle: {
    color: colors.primary,
    fontFamily: 'Inter_800ExtraBold',
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
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  forgotPasswordLink: {
    paddingVertical: 4,
  },
  linkText: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_700Bold',
  },
});
