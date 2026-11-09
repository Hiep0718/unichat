import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UCIcon } from '../../../components/uc-icon';
import { UCTabHero, heroButtonStyle } from '../../../components/uc-tab-hero';

import type { IconName } from '../../../components/uc-icon';
import type { FeedFilter, FeedStats } from '../feed-types';

interface FeedHeroProps {
  /** Undefined khi số liệu chưa về hoặc không tải được. */
  readonly stats: FeedStats | undefined;
  readonly active: FeedFilter;
  readonly onSelect: (filter: FeedFilter) => void;
}

interface StatTileProps {
  readonly icon: IconName;
  readonly value: number | undefined;
  readonly label: string;
  readonly accent: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly testID: string;
}

/** Một ô số liệu mờ trên nền tối; bấm để chuyển sang bộ lọc tương ứng. */
function StatTile({ icon, value, label, accent, selected, onPress, testID }: StatTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, selected && styles.tileSelected, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${value ?? 'Đang tải'} ${label}`}
      testID={testID}
    >
      <View style={[styles.tileIcon, { backgroundColor: accent }]}>
        <UCIcon name={icon} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.tileText}>
        <Text style={styles.tileValue}>{value ?? '—'}</Text>
        <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
      </View>
    </Pressable>
  );
}

/**
 * Dải đầu Bảng tin, cùng khuôn với Trợ lý AI và Tài khoản.
 *
 * Hai ô số liệu không chỉ để xem: "chưa giải đáp" là việc người đọc có thể
 * làm ngay, nên bấm vào là lọc ra đúng những câu đó.
 */
export function FeedHero({ stats, active, onSelect }: FeedHeroProps) {
  const saved = active === 'SAVED';
  return (
    <UCTabHero
      title="Bảng tin"
      subtitle="Câu hỏi và thảo luận từ các nhóm bạn tham gia."
      testID="feed-hero"
      action={
        <Pressable
          style={({ pressed }) => [heroButtonStyle, saved && styles.savedOn, pressed && styles.pressed]}
          onPress={() => onSelect(saved ? 'NEW' : 'SAVED')}
          accessibilityRole="button"
          accessibilityState={{ selected: saved }}
          accessibilityLabel={saved ? 'Quay lại bài mới nhất' : 'Xem bài đã lưu'}
          testID="feed-hero-saved"
        >
          <UCIcon name={saved ? 'bookmark' : 'bookmark-border'} size={21} color="#FFFFFF" />
        </Pressable>
      }
    >
      <View style={styles.tiles}>
        <StatTile
          icon="help-outline"
          value={stats?.unansweredCount}
          label="chưa giải đáp"
          accent="#F59E0B"
          selected={active === 'UNANSWERED'}
          onPress={() => onSelect('UNANSWERED')}
          testID="feed-stat-unanswered"
        />
        <StatTile
          icon="forum"
          value={stats?.totalPosts}
          label="bài viết"
          accent="#3346F5"
          selected={active === 'NEW'}
          onPress={() => onSelect('NEW')}
          testID="feed-stat-posts"
        />
      </View>
    </UCTabHero>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10, marginTop: 18 },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tileSelected: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.4)' },
  tileIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tileText: { flex: 1, minWidth: 0 },
  tileValue: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.3 },
  tileLabel: { color: 'rgba(226,232,248,0.72)', fontSize: 12.5 },
  savedOn: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.5)' },
  pressed: { opacity: 0.75 },
});
