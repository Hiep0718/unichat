/**
 * Dải đầu tối dùng chung cho các tab: Bảng tin, Trợ lý AI, Tin nhắn, Tài khoản.
 *
 * Nền là họ màu thanh bên của web (`--ray-*`), tiêu đề là `--font-page-title`,
 * tức cùng vai với `PageHeader` ở web.
 *
 * Trước đây mỗi tab tự vẽ dải của mình với chuyển màu, cỡ chữ và trang trí
 * lệch nhau một chút. Gom về một chỗ thì đổi một lần là mọi tab đổi theo, và
 * người dùng chuyển tab không thấy đầu trang nhảy kích thước hay màu.
 *
 * Dải chạy hẳn lên dưới thanh trạng thái, nên khi tab đang hiện, chữ trên
 * thanh trạng thái được chuyển sang màu sáng và trả lại khi rời tab.
 */
import React, { useCallback } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { button, palette } from '../design/tokens';
import { fonts, typography } from '../design/typography';

import type { ReactNode } from 'react';

interface UCTabHeroProps {
  readonly title: string;
  readonly subtitle?: string;
  /** Nút ở góc phải hàng tiêu đề. */
  readonly action?: ReactNode;
  /** Nội dung dưới tiêu đề: ô hỏi, thẻ hồ sơ, số liệu... */
  readonly children?: ReactNode;
  readonly testID?: string;
}

/** Chồng tài liệu trang trí ở góc phải, vẽ bằng khối nên không cần ảnh. */
function PaperStack() {
  return (
    <View style={styles.paperStack} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.sheet, styles.sheetBack]} />
      <View style={[styles.sheet, styles.sheetMid]} />
      <View style={[styles.sheet, styles.sheetFront]}>
        <View style={styles.sheetLine} />
        <View style={[styles.sheetLine, styles.sheetLineShort]} />
        <View style={styles.sheetLine} />
      </View>
    </View>
  );
}

/** Dải đầu tối với tiêu đề lớn, dòng phụ và nội dung tuỳ tab. */
export function UCTabHero({ title, subtitle, action, children, testID }: UCTabHeroProps) {
  const insets = useSafeAreaInsets();
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      return () => StatusBar.setBarStyle('dark-content');
    }, []),
  );

  return (
    <View style={styles.wrap} testID={testID}>
      <LinearGradient
        colors={[palette.rayNen, palette.rayNen, palette.rayNoi]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(90,155,252,0.28)', 'rgba(90,155,252,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Trang trí chỉ vẽ khi góc phải còn trống: ở Bảng tin, Trợ lý AI và Tin
          nhắn nó từng đè lên nút hành động và cắt ngang dòng mô tả. */}
      {action ? null : <PaperStack />}

      <View style={[styles.body, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          {action}
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', backgroundColor: palette.rayNen },
  body: { paddingHorizontal: 20, paddingBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  // Cỡ tiêu đề trang của web (`--font-page-title`): chuyển tab không thấy tiêu đề đổi cỡ.
  title: { flexShrink: 1, color: palette.rayMuc, ...typography.pageTitle },
  subtitle: { color: palette.rayMucNhat, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginTop: 4, maxWidth: '78%' },
  paperStack: { position: 'absolute', top: 18, right: 10, width: 128, height: 118 },
  sheet: {
    position: 'absolute',
    width: 46,
    height: 60,
    borderRadius: 7,
    backgroundColor: '#C9D2E4',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  sheetBack: { top: 0, left: 16, transform: [{ rotate: '-9deg' }], opacity: 0.55 },
  sheetMid: { top: 2, left: 54, transform: [{ rotate: '7deg' }], opacity: 0.75 },
  sheetFront: { top: 46, left: 44, width: 52, height: 66, backgroundColor: '#E6EBF5', paddingHorizontal: 8, paddingTop: 12, gap: 6 },
  sheetLine: { height: 3, borderRadius: 2, backgroundColor: 'rgba(90,110,160,0.45)' },
  sheetLineShort: { width: '62%' },
});

/** Nút icon tròn mờ trên nền tối, cho góc phải của dải đầu. */
export const heroButtonStyle = {
  width: 42,
  height: 42,
  borderRadius: button.radius,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: palette.trenAnhNut,
  borderWidth: 1,
  borderColor: palette.trenAnhNutVien,
};
