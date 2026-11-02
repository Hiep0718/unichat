import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { colors, spacing } from '../../src/design/tokens';
import { typography } from '../../src/design/typography';
import { UCTextInput } from '../../src/components/uc-text-input';
import { UCButton } from '../../src/components/uc-button';
import { UCIcon } from '../../src/components/uc-icon';
import { authApi } from '../../src/features/auth/auth-api';
import { registerSchema } from '../../src/features/auth/auth-schema';

const HERO = require('../../assets/images/auth-hero.jpg');
const HERO_HEIGHT = 300;

/**
 * Màn đăng ký.
 *
 * Cùng vỏ với màn đăng nhập: dải ảnh tối ở trên, tờ giấy trắng trôi lên.
 * Khác ở nút quay lại góc trái và bốn trường thay vì hai.
 *
 * Ô đồng ý điều khoản khóa nút tạo tài khoản. Bản web từng có ô này mà
 * không gài gì cả, nên tài khoản tạo được trong khi chưa đồng ý điều gì;
 * đây là cùng một quy tắc, viết lại cho React Native.
 */
export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
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
      await authApi.register({ email: email.trim(), password });

      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập để bắt đầu.',
        [{ text: 'Đăng nhập ngay', onPress: () => router.replace('/(auth)/login') }],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setGeneralError(
        message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Ảnh neo lên đỉnh, không canh giữa.

          React Native không có object-position, nên resizeMode="cover" luôn
          canh giữa. Tâm sáng của bức vẽ nằm ở khoảng 15% chiều cao, còn dải này
          chỉ cao 300px — canh giữa thì nó cắt đúng khúc giữa tối om và bỏ mất
          tâm sáng trên mọi khổ máy. Bọc trong một khung cắt rồi cho ảnh cao
          theo tỷ lệ thật thì phần hiện ra là 300px đầu của ảnh. */}
      <View style={styles.heroClip}>
        <Image source={HERO} style={styles.hero} resizeMode="cover" />
      </View>
      <View style={styles.heroScrim} />

      {/* Chiều cao cố định, cùng lý do như màn đăng nhập: một khối co theo
          nội dung cộng vùng an toàn thì mỗi máy ra một chiều cao khác, và
          tờ giấy bên dưới cắt mất chữ trên những máy có tai thỏ. */}
      <View style={styles.heroBlock}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Pressable
            style={styles.back}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={8}
          >
            <UCIcon name="chevron-left" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <UCIcon name="school" size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandName}>UniChat</Text>
              <Text style={styles.brandSub}>AI Platform</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Tham gia UniChat{'\n'}ngay hôm nay</Text>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <ScrollView
          style={styles.sheet}
          contentContainerStyle={styles.sheetBody}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Tạo tài khoản để bắt đầu học cùng AI trên chính tài liệu của bạn.
          </Text>

          {generalError ? (
            <View style={styles.errorBox}>
              <UCIcon name="error-outline" size={17} color={colors.error} />
              <Text style={styles.errorText}>{generalError}</Text>
            </View>
          ) : null}

          <UCTextInput
            label="Email"
            icon="mail-outline"
            placeholder="ban@truong.edu.vn"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            {...(errors.email ? { error: errors.email } : {})}
          />

          <UCTextInput
            label="Mật khẩu"
            icon="lock-outline"
            placeholder="Ít nhất 12 ký tự"
            value={password}
            onChangeText={setPassword}
            isPassword
            {...(errors.password ? { error: errors.password } : {})}
          />

          <UCTextInput
            label="Xác nhận mật khẩu"
            icon="shield"
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
            {...(errors.confirmPassword ? { error: errors.confirmPassword } : {})}
          />

          <Pressable
            style={styles.terms}
            onPress={() => setAgreed((on) => !on)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="Đồng ý với điều khoản sử dụng và chính sách bảo mật"
          >
            <View style={[styles.box, agreed && styles.boxOn]}>
              {agreed ? <UCIcon name="check" size={13} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.termsText}>
              Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của UniChat.
            </Text>
          </Pressable>

          <UCButton
            title="Tạo tài khoản"
            onPress={handleRegister}
            loading={isLoading}
            disabled={!agreed}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản?</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerLink}>Đăng nhập ngay</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070B1A' },
  heroClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  /* Rộng hết khung, cao theo tỷ lệ thật của bức vẽ (780 x 1688), nên nó cao
     hơn 300px và khung bên ngoài cắt phần dư ở dưới. */
  hero: { width: '100%', aspectRatio: 780 / 1688 },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    backgroundColor: 'rgba(7, 11, 26, 0.52)',
  },

  /* Chiều cao cố định, nên tờ giấy bên dưới luôn bắt đầu ở cùng một chỗ
     bất kể vùng an toàn của máy rộng hẹp ra sao. */
  heroBlock: { height: HERO_HEIGHT },

  safe: { paddingHorizontal: spacing.lg },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(10, 15, 34, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { ...typography.bodyLg, color: '#FFFFFF', fontWeight: '700' },
  brandSub: { ...typography.labelSm, color: 'rgba(255,255,255,0.68)' },
  heroTitle: {
    ...typography.headlineLg,
    marginTop: spacing.md,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 34,
  },

  /* -28 là phần đè lên đáy dải ảnh, đúng bằng bán kính bo góc trên. */
  sheetWrap: { flex: 1, marginTop: -28 },
  sheet: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetBody: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },

  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.errorContainer,
  },
  errorText: { ...typography.bodySm, color: colors.onErrorContainer, flex: 1 },

  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.outline,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  termsText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },

  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  footerLink: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },
});
