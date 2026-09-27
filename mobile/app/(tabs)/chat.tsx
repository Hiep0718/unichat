import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { colors, spacing, radii, glass } from '../../src/design/tokens';
import { shadows } from '../../src/design/shadows';
import { UCIcon, IconName } from '../../src/components/uc-icon';
import { UCGlassCard } from '../../src/components/uc-glass-card';

interface FeatureCardProps {
  icon: IconName;
  title: string;
  desc: string;
  badge: string;
}

function FeatureCard({ icon, title, desc, badge }: FeatureCardProps) {
  return (
    <UCGlassCard
      variant="light"
      style={styles.featureCard}
      contentStyle={styles.featureCardInner}
    >
      <View style={styles.featureIconCircle}>
        <UCIcon name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.featureTextWrap}>
        <View style={styles.featureHeaderRow}>
          <Text style={styles.featureTitle}>{title}</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{badge}</Text>
          </View>
        </View>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </UCGlassCard>
  );
}

const SAMPLE_PROMPTS = [
  'Tóm tắt các kiến thức cốt lõi của tài liệu...',
  'So sánh sự khác nhau giữa hai khái niệm...',
  'Liệt kê các định lý và công thức quan trọng...',
  'Giải thích chi tiết quy trình hoạt động...',
];

export default function ChatTabScreen() {
  const handleStartChat = () => {
    router.push('/(tabs)');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Liquid Glass Hero Banner */}
      <UCGlassCard variant="navy" style={styles.headerBanner} glow>
        <View style={styles.bannerBadge}>
          <UCIcon name="auto-awesome" size={13} color="#57DFFE" />
          <Text style={styles.bannerBadgeText}>AI Knowledge Platform</Text>
        </View>
        <Text style={styles.bannerTitle}>Hỏi đáp Trí thức AI</Text>
        <Text style={styles.bannerSubtitle}>
          Hệ thống truy hồi thích ứng và lập luận học thuật, trích dẫn chính xác 100% từ tài liệu.
        </Text>
      </UCGlassCard>

      {/* Primary Action Button */}
      <TouchableOpacity
        style={styles.startBtn}
        onPress={handleStartChat}
        activeOpacity={0.85}
      >
        <UCIcon name="chat" size={20} color="#FFFFFF" />
        <Text style={styles.startBtnText}>Chọn Không gian để Chat</Text>
        <UCIcon name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Suggested Prompts */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Gợi ý câu hỏi học tập</Text>
        <View style={styles.promptList}>
          {SAMPLE_PROMPTS.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.promptItem}
              onPress={handleStartChat}
              activeOpacity={0.75}
            >
              <View style={styles.promptIconWrap}>
                <UCIcon name="lightbulb-outline" size={16} color="#00687A" />
              </View>
              <Text style={styles.promptText}>{prompt}</Text>
              <UCIcon name="arrow-forward" size={14} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Capability Highlights */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Tính năng AI vượt trội</Text>
        <View style={styles.featuresList}>
          <FeatureCard
            icon="psychology"
            title="Truy hồi Ngữ nghĩa"
            desc="Tìm đúng bản chất câu hỏi theo ngữ cảnh tiếng Việt, vượt trội hơn tìm kiếm từ khóa thông thường."
            badge="Vector E5"
          />
          <FeatureCard
            icon="format-quote"
            title="Trích dẫn Minh bạch"
            desc="Mọi câu trả lời đều đính kèm trích đoạn gốc từ giáo trình để sinh viên đối chiếu và kiểm chứng."
            badge="100% Fact"
          />
          <FeatureCard
            icon="hub"
            title="Lập luận Đa tài liệu"
            desc="Tổng hợp và đối chiếu kiến thức giữa nhiều chương mục sách và slide giảng dạy."
            badge="Multi-hop"
          />
        </View>
      </View>
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
  headerBanner: {
    borderRadius: 24,
    marginBottom: spacing.md,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 6,
    marginBottom: spacing.sm,
  },
  bannerBadgeText: {
    color: '#ACEDFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  bannerSubtitle: {
    color: '#DCE1FF',
    fontSize: 13,
    lineHeight: 19,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00236F',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 18,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...shadows.xl,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: spacing.sm + 2,
  },
  promptList: {
    gap: spacing.sm,
  },
  promptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    gap: spacing.sm,
    ...shadows.glass,
  },
  promptIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptText: {
    color: '#334155',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  featuresList: {
    gap: spacing.sm + 2,
  },
  featureCard: {
    borderRadius: 20,
    marginBottom: 2,
  },
  featureCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureTitle: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  badgePill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  badgePillText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '700',
  },
  featureDesc: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 17,
  },
});
