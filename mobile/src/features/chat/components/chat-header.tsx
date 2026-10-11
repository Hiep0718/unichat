import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, spacing, radii } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';

interface ChatHeaderProps {
  workspaceName?: string;
  documentCount?: number;
  onBack: () => void;
  onOpenHistory?: () => void;
  isStreaming?: boolean;
}

export function ChatHeader({
  workspaceName = 'Hỏi đáp Không gian',
  documentCount = 0,
  onBack,
  onOpenHistory,
  isStreaming = false,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} tint="systemThinMaterialLight" style={StyleSheet.absoluteFill} />
      ) : null}

      <View style={styles.specularHighlight} />

      <View style={styles.contentRow}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.circleButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="chat-header-back"
        >
          <UCIcon name="arrow-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          {/* Gemini-Style Model / Workspace Dropdown Capsule */}
          <View style={styles.geminiDropdownPill}>
            <Text style={styles.workspaceTitle} numberOfLines={1}>
              {workspaceName}
            </Text>
            <UCIcon name="keyboard-arrow-down" size={16} color="#64748B" />
          </View>

          {(isStreaming || documentCount > 0) && (
            <View style={styles.statusBadgePill}>
              <View
                style={[
                  styles.statusDot,
                  isStreaming ? styles.statusDotStreaming : styles.statusDotReady,
                ]}
              />
              <Text style={styles.statusText}>
                {isStreaming
                  ? 'AI đang suy luận...'
                  : `RAG Sẵn sàng • ${documentCount} tài liệu`}
              </Text>
            </View>
          )}
        </View>

        {onOpenHistory ? (
          <TouchableOpacity
            onPress={onOpenHistory}
            style={styles.circleButton}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="chat-header-history"
          >
            <UCIcon name="history" size={20} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={styles.circleButton}>
            <UCIcon name="auto-awesome" size={17} color="#00687A" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
    zIndex: 100,
    position: 'relative',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#FFFFFF',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  geminiDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workspaceTitle: {
    ...typography.labelMd,
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 14,
    maxWidth: 180,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  statusDotReady: {
    backgroundColor: colors.success,
  },
  statusDotStreaming: {
    backgroundColor: '#06B6D4',
  },
  statusText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
});
