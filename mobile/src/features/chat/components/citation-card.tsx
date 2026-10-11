import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { spacing, radii } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { CitationItem } from '../../../types/api';

interface CitationCardProps {
  citation: CitationItem;
  index: number;
  onPress?: (citation: CitationItem) => void;
  compact?: boolean;
}

export function CitationCard({ citation, index, onPress, compact = false }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress(citation);
    } else {
      setExpanded((prev) => !prev);
    }
  };

  const scorePercent = Math.round((citation.score ?? 0) * 100);

  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactPill}
        onPress={handlePress}
        activeOpacity={0.7}
        testID={`citation-card-${index}`}
      >
        <UCIcon name="menu-book" size={13} color="#00687A" />
        <Text style={styles.compactFileName} numberOfLines={1}>
          [{index + 1}] {citation.fileName || 'Tài liệu giáo trình'}
        </Text>
        <View style={styles.compactScoreBadge}>
          <Text style={styles.compactScoreText}>{scorePercent}%</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card} testID={`citation-card-${index}`}>
      <TouchableOpacity
        style={styles.header}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconBox}>
          <UCIcon name="menu-book" size={14} color="#00687A" />
        </View>
        <Text style={styles.fileName} numberOfLines={1}>
          [{index + 1}] {citation.fileName || 'Tài liệu giáo trình'}
        </Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{scorePercent}%</Text>
        </View>
        <UCIcon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={16}
          color="#64748B"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detailBox}>
          {citation.locator ? (
            <Text style={styles.locatorText}>Vị trí: {citation.locator}</Text>
          ) : null}
          <Text style={styles.excerptText}>"{citation.excerpt}"</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radii.full,
    gap: 5,
    marginRight: 6,
    maxWidth: 220,
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  compactFileName: {
    ...typography.labelSm,
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 11.5,
    flexShrink: 1,
  },
  compactScoreBadge: {
    backgroundColor: 'rgba(0, 104, 122, 0.08)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.full,
  },
  compactScoreText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00687A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radii.xl,
    marginTop: spacing.xs,
    overflow: 'hidden',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm + 2,
    gap: 7,
  },
  iconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 104, 122, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    ...typography.labelSm,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    fontSize: 12.5,
  },
  scoreBadge: {
    backgroundColor: 'rgba(0, 104, 122, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00687A',
  },
  detailBox: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  locatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  excerptText: {
    ...typography.bodySm,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
