import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, radii } from '../../src/design/tokens';
import { shadows } from '../../src/design/shadows';
import { UCIcon, IconName } from '../../src/components/uc-icon';
import { UCBadge } from '../../src/components/uc-badge';
import { UCGlassCard } from '../../src/components/uc-glass-card';
import { useAuth } from '../../src/features/auth/auth-context';

interface SettingRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
}

function SettingRow({ icon, title, subtitle, badge, onPress }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingIconWrap}>
        <UCIcon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingTextWrap}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.settingBadge}>
          <Text style={styles.settingBadgeText}>{badge}</Text>
        </View>
      ) : (
        <UCIcon name="chevron-right" size={20} color="#94A3B8" />
      )}
    </TouchableOpacity>
  );
}

export default function AccountTabScreen() {
  const { user, logout } = useAuth();
  const userInitial = (user?.email || 'U').charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng UniChat?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Card */}
      <UCGlassCard variant="navy" style={styles.profileGlassCard} glow>
        <View style={styles.profileInnerRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.email?.split('@')[0] || 'Sinh viên'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || 'taolahieptqn122@gmail.com'}
            </Text>
            <View style={styles.badgeRow}>
              <UCBadge
                label={user?.role === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên chính quy'}
                variant="primary"
                size="sm"
              />
              <UCBadge label="Đang hoạt động" variant="success" size="sm" />
            </View>
          </View>
        </View>
      </UCGlassCard>

      {/* System Metrics */}
      <View style={styles.metricsGrid}>
        <UCGlassCard variant="light" style={styles.metricGlassCard}>
          <UCIcon name="memory" size={20} color={colors.primary} />
          <Text style={styles.metricValue}>Gemini 3.5</Text>
          <Text style={styles.metricLabel}>Mô hình AI RAG</Text>
        </UCGlassCard>
        <UCGlassCard variant="light" style={styles.metricGlassCard}>
          <UCIcon name="security" size={20} color="#059669" />
          <Text style={styles.metricValue}>RS256 JWT</Text>
          <Text style={styles.metricLabel}>Bảo mật phiên</Text>
        </UCGlassCard>
        <UCGlassCard variant="light" style={styles.metricGlassCard}>
          <UCIcon name="wifi-tethering" size={20} color="#0284C7" />
          <Text style={styles.metricValue}>Cổng 8082</Text>
          <Text style={styles.metricLabel}>Core API Online</Text>
        </UCGlassCard>
      </View>

      {/* Preferences Section */}
      <UCGlassCard variant="light" style={styles.sectionGlassCard}>
        <Text style={styles.sectionHeader}>Cài đặt & Tiện ích</Text>
        <SettingRow
          icon="notifications-none"
          title="Thông báo học tập"
          subtitle="Nhắc nhở lịch học và câu trả lời mới"
        />
        <View style={styles.divider} />
        <SettingRow
          icon="storage"
          title="Bộ nhớ tài liệu học tập"
          subtitle="Đồng bộ hóa đám mây Supabase"
          badge="Kích hoạt"
        />
        <View style={styles.divider} />
        <SettingRow
          icon="shield"
          title="Bảo mật & Quyền riêng tư"
          subtitle="Mã hóa phần cứng Keychain/Keystore"
        />
      </UCGlassCard>

      {/* About Section */}
      <UCGlassCard variant="light" style={styles.sectionGlassCard}>
        <Text style={styles.sectionHeader}>Thông tin ứng dụng</Text>
        <SettingRow
          icon="info-outline"
          title="Phiên bản UniChat Mobile"
          badge="v0.1.0 (Build 57)"
        />
        <View style={styles.divider} />
        <SettingRow
          icon="school"
          title="Đề tài tốt nghiệp ĐH Bách Khoa"
          subtitle="Nền tảng tri thức học thuật AI"
        />
      </UCGlassCard>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <UCIcon name="logout" size={18} color="#DC2626" />
        <Text style={styles.logoutBtnText}>Đăng xuất khỏi thiết bị này</Text>
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        UniChat AI Academic Knowledge Platform • Made with ❤️ for Students
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FC',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  profileGlassCard: {
    marginBottom: spacing.md,
    borderRadius: 24,
  },
  profileInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#57DFFE',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#00236F',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  userEmail: {
    color: '#DCE1FF',
    fontSize: 12,
    marginBottom: spacing.xs + 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricGlassCard: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  metricValue: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
  },
  sectionGlassCard: {
    borderRadius: 22,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  settingTextWrap: {
    flex: 1,
  },
  settingTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  settingSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  settingBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  settingBadgeText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(254, 242, 242, 0.85)',
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(254, 202, 202, 0.95)',
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    ...shadows.glass,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
