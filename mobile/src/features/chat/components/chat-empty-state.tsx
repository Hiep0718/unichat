import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { useOptionalAuth } from '../../../features/auth/auth-context';
import { DocumentItem } from '../../workspaces/workspace-types';

interface ChatEmptyStateProps {
  workspaceName?: string;
  documents?: DocumentItem[];
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  {
    category: 'TỔNG HỢP KIẾN THỨC',
    prompt: 'Tóm tắt các nội dung cốt lõi và định lý trọng tâm trong tài liệu',
    icon: 'auto-awesome' as const,
    color: '#0284C7',
    bgColor: 'rgba(224, 242, 254, 0.85)',
    borderColor: 'rgba(186, 230, 253, 0.9)',
  },
  {
    category: 'TRA CỨU KHÁI NIỆM',
    prompt: 'Giải thích chi tiết các thuật ngữ và khái niệm quan trọng nhất',
    icon: 'help-outline' as const,
    color: '#059669',
    bgColor: 'rgba(209, 250, 229, 0.85)',
    borderColor: 'rgba(167, 243, 208, 0.9)',
  },
  {
    category: 'SO SÁNH & ĐÁNH GIÁ',
    prompt: 'Phân tích ưu nhược điểm và so sánh sự khác nhau giữa các phương pháp',
    icon: 'lightbulb-outline' as const,
    color: '#D97706',
    bgColor: 'rgba(254, 243, 199, 0.85)',
    borderColor: 'rgba(253, 230, 138, 0.9)',
  },
  {
    category: 'ÔN THI & BÀI TẬP',
    prompt: 'Tạo 3 câu hỏi trắc nghiệm ôn tập kèm lời giải trích dẫn từ tài liệu',
    icon: 'checklist' as const,
    color: '#7C3AED',
    bgColor: 'rgba(237, 233, 254, 0.85)',
    borderColor: 'rgba(221, 214, 254, 0.9)',
  },
];

export function ChatEmptyState({
  workspaceName,
  documents = [],
  onSelectPrompt,
}: ChatEmptyStateProps) {
  const auth = useOptionalAuth();
  const user = auth?.user;

  const userName = useMemo(() => {
    if (user?.displayName?.trim()) {
      const parts = user.displayName.trim().split(/\s+/);
      return parts[parts.length - 1] || user.displayName.trim();
    }
    if (user?.email) {
      const local = user.email.split('@')[0] ?? '';
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
    return 'bạn';
  }, [user]);

  return (
    <View style={styles.container}>
      {/* Top Academic AI Badge */}
      <View style={styles.topBadgeWrapper}>
        <View style={styles.topModelBadge}>
          <UCIcon name="auto-awesome" size={13} color="#00687A" />
          <Text style={styles.topModelText}>Hỏi đáp Trí thức AI</Text>
        </View>
      </View>

      {/* Gemini Signature Glowing Centerpiece */}
      <View style={styles.geminiHeroCenter}>
        <View style={styles.starAuraContainer}>
          {/* Diffuse glowing aura */}
          <LinearGradient
            colors={['rgba(87, 223, 254, 0.45)', 'rgba(168, 85, 247, 0.20)', 'transparent']}
            style={styles.starAuraGradient}
          />
          {/* Multi-spectrum Gemini 4-Point Star Badge */}
          <LinearGradient
            colors={['#22D3EE', '#3B82F6', '#8B5CF6', '#EC4899', '#FBBF24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.geminiStarBadge}
          >
            <UCIcon name="auto-awesome" size={30} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Gemini Signature Greeting Headline */}
        <Text style={styles.geminiHeadline}>
          Bắt đầu luôn nào, {userName}
        </Text>
        <Text style={styles.geminiSubtitle}>
          {workspaceName
            ? `Tra cứu thông minh và lập luận đa bước dựa trên tài liệu của không gian "${workspaceName}".`
            : 'AI sẽ tra cứu tài liệu học tập của không gian này để trích dẫn câu trả lời chính xác.'}
        </Text>
      </View>

      {/* Referenced Documents Glass Carousel */}
      {documents.length > 0 && (
        <View style={styles.docsSection}>
          <View style={styles.sectionHeaderRow}>
            <UCIcon name="folder-open" size={13} color={colors.primary} />
            <Text style={styles.sectionHeader}>
              TÀI LIỆU ĐANG THAM CHIẾU ({documents.length})
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.docsScroll}
          >
            {documents.slice(0, 5).map((doc) => (
              <View key={doc.id} style={styles.docChip}>
                <UCIcon name="description" size={13} color={colors.secondary} />
                <Text style={styles.docName} numberOfLines={1}>
                  {doc.name || 'Tài liệu'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Minimalist Gemini-style Starter Prompt Chips */}
      <View style={styles.promptsSection}>
        <View style={styles.sectionHeaderRow}>
          <UCIcon name="tips-and-updates" size={13} color={colors.secondary} />
          <Text style={styles.sectionHeader}>GỢI Ý CÂU HỎI BẮT ĐẦU</Text>
        </View>

        <View style={styles.promptList}>
          {STARTER_PROMPTS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.promptCard, { borderColor: item.borderColor }]}
              onPress={() => onSelectPrompt(item.prompt)}
              activeOpacity={0.75}
              testID={`starter-prompt-${idx}`}
            >
              <View style={[styles.promptIconBox, { backgroundColor: item.bgColor }]}>
                <UCIcon name={item.icon} size={16} color={item.color} />
              </View>
              <View style={styles.promptContent}>
                <Text style={[styles.promptCategory, { color: item.color }]}>
                  {item.category}
                </Text>
                <Text style={styles.promptText} numberOfLines={2}>
                  {item.prompt}
                </Text>
              </View>
              <View style={styles.arrowBox}>
                <UCIcon name="arrow-forward" size={14} color={colors.outline} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  topBadgeWrapper: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  topModelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 238, 254, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(144, 168, 255, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 6,
  },
  topModelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00687A',
    letterSpacing: 0.2,
  },
  geminiHeroCenter: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  starAuraContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 80,
    height: 80,
    marginBottom: spacing.md,
  },
  starAuraGradient: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  geminiStarBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  geminiHeadline: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: spacing.xs + 2,
    fontFamily: 'Inter_600SemiBold',
  },
  geminiSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '88%',
    fontSize: 13,
  },
  docsSection: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  docsScroll: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 248, 0.95)',
    gap: 6,
    maxWidth: 200,
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  docName: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 12,
  },
  promptsSection: {
    marginBottom: spacing.md,
  },
  promptList: {
    gap: spacing.sm,
  },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1.2,
    gap: spacing.md,
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  promptIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptContent: {
    flex: 1,
  },
  promptCategory: {
    ...typography.labelSm,
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  promptText: {
    ...typography.bodySm,
    color: colors.onSurface,
    lineHeight: 18,
    fontWeight: '500',
    fontSize: 12.5,
  },
  arrowBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
