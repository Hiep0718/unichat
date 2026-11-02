import { useState } from 'react';
import {
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
import { useAuth } from '../../src/features/auth/auth-context';
import { loginSchema } from '../../src/features/auth/auth-schema';

const HERO = require('../../assets/images/auth-hero.jpg');
const HERO_HEIGHT = 300;

/**
 * Màn đăng nhập.
 *
 * Dải ảnh tối ở trên, tờ giấy trắng trôi lên đè một đoạn lên nó — cùng bố
 * cục với màn đăng nhập trên web ở khổ điện thoại, nên hai nơi đọc ra là
 * một sản phẩm chứ không phải hai.
 *
 * Nút "điền tài khoản thử" đã bị bỏ: nó nhúng thẳng mật khẩu của một tài
 * khoản vào mã nguồn, tức là vào cả bản phát hành.
 */
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
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setGeneralError(message || 'Đăng nhập không thành công. Vui lòng thử lại.');
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

      {/* Khối này cao đúng HERO_HEIGHT, cố định.

          Bản trước để SafeAreaView tự co theo nội dung rồi kéo tờ giấy lên
          bằng một margin âm. Chiều cao đó phụ thuộc vùng an toàn của từng
          máy, nên trên máy có tai thỏ tờ giấy trôi quá cao và cắt mất dòng
          tiêu đề thứ hai. Cố định chiều cao thì vị trí tờ giấy không còn
          phụ thuộc thiết bị. */}
      <View style={styles.heroBlock}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <UCIcon name="school" size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandName}>UniChat</Text>
              <Text style={styles.brandSub}>AI Platform</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Không gian học thuật{'\n'}dành riêng cho bạn.
          </Text>

          <View style={styles.heroNote}>
            <UCIcon name="auto-awesome" size={15} color="#FFFFFF" />
            <Text style={styles.heroNoteText}>
              Hiểu sâu hơn từ chính nguồn tài liệu của bạn
            </Text>
          </View>
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
          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>
            Đăng nhập để tiếp tục vào không gian học tập của bạn.
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
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={setPassword}
            isPassword
            {...(errors.password ? { error: errors.password } : {})}
          />

          <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
            <Text style={styles.forgot}>Quên mật khẩu?</Text>
          </Pressable>

          <UCButton
            title="Đăng nhập"
            onPress={handleLogin}
            loading={isLoading}
            icon="arrow-forward"
            style={styles.submit}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
              <Text style={styles.footerLink}>Đăng ký</Text>
            </Pressable>
          </View>

          <View style={styles.badge}>
            <UCIcon name="shield" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.badgeText}>Dữ liệu của bạn được bảo mật</Text>
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

  /* Lớp tối trên ảnh, để chữ đọc được ở bất kỳ khung hình nào của bức vẽ. */
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
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
    marginTop: spacing.lg,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 34,
  },
  heroNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: spacing.md,
  },
  heroNoteText: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.88)',
    flex: 1,
  },

  /* Tờ giấy kéo lên đè đáy dải ảnh. Phần đè là thứ nói cho người dùng biết
     còn nội dung phía dưới để cuộn. */
  /* -28 là phần đè lên đáy dải ảnh, đúng bằng bán kính bo góc trên của tờ
     giấy. Con số này đo từ một khối cao cố định, không còn từ chiều cao
     thay đổi theo máy như bản trước. */
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

  title: { ...typography.headlineMd, color: colors.onSurface, fontWeight: '700' },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: -spacing.sm,
  },
  forgot: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  submit: { marginTop: spacing.xs },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.errorContainer,
  },
  errorText: { ...typography.bodySm, color: colors.onErrorContainer, flex: 1 },

  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  footerLink: { ...typography.bodySm, color: colors.primary, fontWeight: '700' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  badgeText: { ...typography.labelSm, color: colors.onSurfaceVariant },
});
