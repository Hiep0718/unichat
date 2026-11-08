/**
 * Trạng thái chờ và lỗi của màn hình một nhóm.
 *
 * Bộ khung lúc tải vẽ đúng hình dạng màn thật — dải bìa tối, thanh tab, vài
 * thẻ — để khi dữ liệu về, nội dung hiện vào đúng chỗ thay vì cả màn nhảy từ
 * một thẻ xám lẻ loi sang một dải bìa tối. Nút quay lại dùng được ngay, vì
 * người dùng không nên bị giữ lại chỉ để chờ một màn họ đã đổi ý.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UCIcon } from '../../../components/uc-icon';
import { UCSkeleton, UCSkeletonCard } from '../../../components/uc-skeleton';
import { radii, spacing, workplace } from '../../../design/tokens';

const DARK = ['#0F172A', '#1E293B'] as const;
/** Khối mờ trên nền tối; khung mặc định màu xám nhạt sẽ loá trên dải bìa. */
const ON_DARK = { backgroundColor: 'rgba(255,255,255,0.16)' };

function BackButton({ onBack }: { readonly onBack: () => void }) {
  return (
    <Pressable style={styles.iconBtn} onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Quay lại" testID="group-back">
      <UCIcon name="chevron-left" size={22} color="#FFFFFF" />
    </Pressable>
  );
}

/** Khung chờ mô phỏng dải bìa, thanh tab và danh sách. */
export function GroupLoadingSkeleton({ onBack }: { readonly onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen} testID="group-loading" accessibilityLabel="Đang tải nhóm" accessibilityState={{ busy: true }}>
      <LinearGradient colors={DARK} style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onBack={onBack} />
        <View style={styles.identity}>
          <UCSkeleton width={56} height={56} radius={radii.lg} style={ON_DARK} />
          <View style={styles.titles}>
            <UCSkeleton width="70%" height={22} radius={6} style={ON_DARK} />
            <UCSkeleton width="50%" height={13} radius={4} style={[ON_DARK, styles.gapTop]} />
          </View>
        </View>
        <UCSkeleton height={50} radius={radii.xl} style={[ON_DARK, styles.ask]} />
      </LinearGradient>
      <View style={styles.tabs}>
        {[64, 40, 82, 70].map((width) => (
          <UCSkeleton key={width} width={width} height={14} radius={4} />
        ))}
      </View>
      <View style={styles.cards}>
        <UCSkeletonCard />
        <UCSkeletonCard />
      </View>
    </View>
  );
}

interface GroupErrorStateProps {
  /** Lỗi mạng thì có thử lại; nhóm không tồn tại thì không. */
  readonly kind: 'failed' | 'missing';
  readonly onBack: () => void;
  readonly onRetry: () => void;
}

/** Không tải được nhóm, hoặc nhóm không tồn tại / không còn quyền xem. */
export function GroupErrorState({ kind, onBack, onRetry }: GroupErrorStateProps) {
  const insets = useSafeAreaInsets();
  const failed = kind === 'failed';
  return (
    <View style={styles.screen}>
      <LinearGradient colors={DARK} style={[styles.errorBar, { paddingTop: insets.top + spacing.sm }]}>
        <BackButton onBack={onBack} />
      </LinearGradient>
      <View style={styles.errorBody}>
        <UCIcon name={failed ? 'cloud-off' : 'search-off'} size={40} color={workplace.inkMuted} />
        <Text style={styles.errorTitle}>{failed ? 'Không tải được nhóm' : 'Không tìm thấy nhóm này'}</Text>
        <Text style={styles.errorText}>
          {failed ? 'Kiểm tra kết nối rồi thử lại.' : 'Nhóm có thể đã bị xoá, hoặc bạn không còn là thành viên.'}
        </Text>
        {failed && (
          <Pressable style={styles.retry} onPress={onRetry} accessibilityRole="button" testID="group-retry">
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: workplace.canvas },
  hero: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  titles: { flex: 1 },
  gapTop: { marginTop: 8 },
  ask: { marginTop: spacing.md },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: workplace.card,
    borderBottomWidth: 1,
    borderBottomColor: workplace.line,
  },
  cards: { padding: spacing.md, gap: spacing.md },
  errorBar: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  errorBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: spacing.xl },
  errorTitle: { color: workplace.ink, fontSize: 17, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  errorText: { color: workplace.inkMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retry: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radii.full, backgroundColor: workplace.ink },
  retryText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
});
