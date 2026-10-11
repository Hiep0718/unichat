import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, radii } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { CitationItem } from '../../../types/api';

interface ChatCitationSheetProps {
  citation: CitationItem | null;
  onClose: () => void;
}

export function ChatCitationSheet({ citation, onClose }: ChatCitationSheetProps) {
  if (!citation) return null;

  const scorePercent = Math.round((citation.score || 0.85) * 100);

  return (
    <Modal visible={!!citation} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : null}

        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Specular highlight */}
          <View style={styles.specularHighlight} />

          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <View style={styles.docIconBox}>
                <UCIcon name="description" size={20} color={colors.primary} />
              </View>
              <View style={styles.docMeta}>
                <Text style={styles.docTitle} numberOfLines={1}>
                  {citation.fileName || 'Tài liệu trích dẫn'}
                </Text>
                <Text style={styles.docLocator}>Vị trí: {citation.locator || 'Đoạn trích dẫn'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <UCIcon name="close" size={20} color={colors.outline} />
            </TouchableOpacity>
          </View>

          <View style={styles.scoreRow}>
            <View style={styles.scoreBadge}>
              <UCIcon name="verified" size={14} color="#059669" />
              <Text style={styles.scoreText}>Độ liên quan: {scorePercent}%</Text>
            </View>
            <Text style={styles.scoreHint}>Được xác thực bởi RAG Reasoner</Text>
          </View>

          <ScrollView style={styles.excerptBox} showsVerticalScrollIndicator={false}>
            <Text style={styles.excerptHeader}>NỘI DUNG NGUYÊN GỐC TỪ GIÁO TRÌNH</Text>
            <View style={styles.quoteBlock}>
              <Text style={styles.excerptText}>"{citation.excerpt || 'Không có đoạn trích dẫn'}"</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radii['3xl'],
    borderTopRightRadius: radii['3xl'],
    padding: spacing.lg,
    maxHeight: '70%',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  handleBar: {
    width: 40,
    height: 4.5,
    backgroundColor: 'rgba(203, 213, 225, 0.9)',
    borderRadius: radii.full,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  docIconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(231, 238, 254, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(144, 168, 255, 0.4)',
  },
  docMeta: {
    flex: 1,
  },
  docTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 15,
  },
  docLocator: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(226, 232, 248, 0.8)',
    marginBottom: spacing.md,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(209, 250, 229, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(167, 243, 208, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    gap: 5,
  },
  scoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#065F46',
  },
  scoreHint: {
    fontSize: 11,
    color: colors.outline,
    fontWeight: '500',
  },
  excerptBox: {
    marginBottom: spacing.md,
  },
  excerptHeader: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    letterSpacing: 0.6,
    fontSize: 11,
    marginBottom: spacing.xs + 2,
  },
  quoteBlock: {
    backgroundColor: 'rgba(244, 246, 252, 0.85)',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderLeftWidth: 3.5,
    borderLeftColor: '#00687A',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 248, 0.9)',
  },
  excerptText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
