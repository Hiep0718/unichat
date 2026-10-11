import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { MessageItem, CitationItem } from '../../../types/api';
import { CitationCard } from './citation-card';

interface MessageBubbleProps {
  message: MessageItem;
  onPressCitation?: (citation: CitationItem) => void;
}

export function MessageBubble({ message, onPressCitation }: MessageBubbleProps) {
  const isUser = message.sender === 'USER';
  const [citationsExpanded, setCitationsExpanded] = useState(false);

  if (isUser) {
    return (
      <View style={styles.userWrapper} testID={`user-message-${message.id}`}>
        <LinearGradient
          colors={['#00236F', '#1E3A8A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{message.content}</Text>
        </LinearGradient>
      </View>
    );
  }

  const citations = message.citations || [];

  return (
    <View style={styles.aiWrapper} testID={`ai-message-${message.id}`}>
      {/* AI Identifier Header */}
      <View style={styles.aiHeader}>
        <View style={styles.aiAvatar}>
          <UCIcon name="auto-awesome" size={14} color="#00687A" />
        </View>
        <Text style={styles.aiName}>UniChat AI</Text>
      </View>

      {/* Clean Unboxed Markdown Response */}
      <View style={styles.markdownWrap}>
        <Markdown style={markdownStyles}>{message.content}</Markdown>
      </View>

      {/* Compact Perplexity/Gemini Citations Strip */}
      {citations.length > 0 && (
        <View style={styles.citationsSection}>
          <TouchableOpacity
            style={styles.citationsSummaryBar}
            onPress={() => setCitationsExpanded(!citationsExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.citationsSummaryLeft}>
              <UCIcon name="verified" size={13} color="#00687A" />
              <Text style={styles.citationsSummaryTitle}>
                Nguồn trích dẫn ({citations.length})
              </Text>
            </View>
            <View style={styles.citationsToggleRow}>
              <Text style={styles.citationsToggleText}>
                {citationsExpanded ? 'Thu gọn' : 'Xem tất cả'}
              </Text>
              <UCIcon
                name={citationsExpanded ? 'expand-less' : 'expand-more'}
                size={15}
                color="#64748B"
              />
            </View>
          </TouchableOpacity>

          {!citationsExpanded ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.citationsScrollStrip}
            >
              {citations.map((c, i) => (
                <CitationCard
                  key={c.citationId || i}
                  citation={c}
                  index={i}
                  onPress={onPressCitation}
                  compact
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.citationsExpandedList}>
              {citations.map((c, i) => (
                <CitationCard
                  key={c.citationId || i}
                  citation={c}
                  index={i}
                  onPress={onPressCitation}
                  compact={false}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  userWrapper: {
    alignItems: 'flex-end',
    marginVertical: spacing.xs + 2,
    paddingLeft: spacing.xl,
  },
  userBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '85%',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  userText: {
    ...typography.bodyMd,
    color: '#FFFFFF',
    lineHeight: 21,
    fontSize: 15,
  },
  aiWrapper: {
    alignItems: 'flex-start',
    marginVertical: spacing.sm,
    width: '100%',
    paddingHorizontal: 2,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: 7,
  },
  aiAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 104, 122, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiName: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  markdownWrap: {
    width: '100%',
    paddingLeft: 2,
  },
  citationsSection: {
    marginTop: spacing.sm + 2,
    width: '100%',
  },
  citationsSummaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 6,
  },
  citationsSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  citationsSummaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00687A',
  },
  citationsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  citationsToggleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
  },
  citationsScrollStrip: {
    gap: 6,
    paddingVertical: 2,
  },
  citationsExpandedList: {
    gap: spacing.xs,
  },
});

const markdownStyles = {
  body: {
    ...typography.bodyMd,
    color: '#0F172A',
    lineHeight: 24,
    fontSize: 15,
  },
  strong: {
    fontWeight: '700' as const,
    color: '#00236F',
  },
  code_inline: {
    backgroundColor: '#F1F5F9',
    color: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 12.5,
  },
  code_block: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 12.5,
  },
  bullet_list: {
    marginVertical: 4,
  },
  bullet_list_item: {
    marginVertical: 2,
  },
};
