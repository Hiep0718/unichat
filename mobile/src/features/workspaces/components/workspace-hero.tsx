import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';

const WEEKDAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

interface WorkspaceHeroProps {
  readonly email?: string | undefined;
  readonly displayName?: string | undefined;
  readonly workspaceCount: number;
  readonly documentCount: number;
  readonly memberCount: number;
  readonly onQuickChat: () => void;
  readonly onNotifications?: (() => void) | undefined;
  readonly onAccount?: (() => void) | undefined;
}

/** Lời chào theo giờ trong ngày. */
function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/** Ngày hôm nay, viết như người Việt đọc nó. */
function today(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}`;
}

/** Tên hiển thị rút từ email khi tài khoản chưa đặt tên. */
function nameFrom(displayName?: string, email?: string): string {
  const trimmed = displayName?.trim();
  if (trimmed) return trimmed;
  return email?.split('@')[0] ?? '';
}

/**
 * Dải chào ở đầu màn Workspace.
 *
 * Một mảng màu đặc mang lời chào, ô hỏi nhanh và ba con số — cùng hình với
 * dải chào trên web, nên hai nơi đọc ra là một sản phẩm.
 */
export function WorkspaceHero({
  email,
  displayName,
  workspaceCount,
  documentCount,
  memberCount,
  onQuickChat,
  onNotifications,
  onAccount,
}: WorkspaceHeroProps) {
  const now = new Date();
  const who = nameFrom(displayName, email);
  const initial = (who || '?').charAt(0).toUpperCase();

  const stats = [
    { value: workspaceCount, label: 'Workspace' },
    { value: documentCount, label: 'Tài liệu' },
    { value: memberCount, label: 'Thành viên' },
  ];

  return (
    <View style={styles.root}>
      {/* Ảnh nền, neo theo mép trên.

          React Native không có background-image, nên đây là một <Image> tuyệt
          đối nằm dưới mọi nội dung. Không dùng resizeMode="cover": ảnh cao
          1170x1200 còn dải này rộng và thấp, nên 'cover' canh giữa và cắt mất
          đúng khúc trên — nơi có vầng sáng và các trang tài liệu. Thay vào đó
          ảnh lấy trọn bề ngang, giữ đúng tỉ lệ của nó, và khung cha cắt phần
          thừa phía dưới. Phần dưới của ảnh gần như đen nên chỗ bị cắt không
          mang nội dung gì.

          Ba vòng tròn đồng tâm vẽ tay trước đây đã bỏ: ảnh đã mang hoa văn
          của riêng nó, và chồng cả hai lên nhau thì thành hai lớp trang trí
          đánh nhau. */}
      <View pointerEvents="none" style={styles.artClip}>
        <Image
          source={require('../../../../assets/images/workspace-hero.jpg')}
          style={styles.art}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel=""
        />
      </View>

      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.topRow}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <UCIcon name="school" size={18} color={colors.primary} />
            </View>
            <Text style={styles.brandName}>UniChat</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onNotifications}
              accessibilityRole="button"
              accessibilityLabel="Thông báo"
              hitSlop={8}
            >
              <UCIcon name="notifications" size={19} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatar}
              onPress={onAccount}
              accessibilityRole="button"
              accessibilityLabel="Tài khoản"
              hitSlop={8}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.date}>{today(now)}</Text>
        <Text style={styles.greeting}>
          {greeting(now)},{who ? `\n${who}` : ''}
        </Text>

        {/* Ô hỏi nhanh. Bấm vào là sang màn chat chứ không gửi tại đây: câu
            hỏi phải thuộc về một nhóm, và việc chọn nhóm nằm ở màn đó. */}
        <TouchableOpacity
          style={styles.ask}
          onPress={onQuickChat}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Hỏi UniChat về tài liệu"
        >
          <UCIcon name="auto-awesome" size={17} color={colors.primary} />
          <TextInput
            style={styles.askInput}
            placeholder="Hỏi UniChat về tài liệu..."
            placeholderTextColor={colors.outline}
            editable={false}
            pointerEvents="none"
          />
          <View style={styles.askSend}>
            <UCIcon name="arrow-upward" size={17} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    /* Navy đậm, đúng màu dải chào trên web (--ray-nen: #151F42), nên hai
       client đọc ra là một sản phẩm. Ảnh nền phủ lên màu này. */
    backgroundColor: '#151F42',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },

  /** Khung cắt: trải kín dải và giấu phần ảnh thừa phía dưới. */
  artClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  /** Ảnh lấy trọn bề ngang và giữ tỉ lệ gốc, nên mép trên luôn nằm ở mép trên. */
  art: { width: '100%', aspectRatio: 1170 / 1200, opacity: 0.34 },

  safe: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { ...typography.bodyLg, color: '#FFFFFF', fontWeight: '700' },

  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    // Đặc, không trong suốt: xem chú thích ở `stat`.
    backgroundColor: '#3A4360',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2C79A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.labelMd, color: '#3A2A14', fontWeight: '700' },

  date: {
    ...typography.labelSm,
    marginTop: spacing.lg,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  greeting: {
    ...typography.headlineLg,
    marginTop: 4,
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 32,
  },

  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.md,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radii.full ?? 999,
    backgroundColor: '#FFFFFF',
  },
  askInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 8,
  },
  askSend: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#121A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  stats: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  /* Ô số liệu: nền đặc, không trong suốt.

     Trắng-16%-trong-suốt để vùng sáng của ảnh xuyên qua, nên nền ô đổi theo
     từng điểm trên ảnh và không đo được — đúng lỗi đã gặp ở dải chào trên
     web. Hai màu dưới đây là kết quả của trắng 16% và 22% phủ trên #151F42,
     nên hình dáng không đổi, chỉ còn đoán được: chữ trắng 9,76:1, chữ phụ
     7,17:1. */
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#3A4360',
    borderWidth: 1,
    borderColor: '#454E6C',
  },
  statValue: { ...typography.bodyLg, color: '#FFFFFF', fontWeight: '700' },
  statLabel: { ...typography.labelSm, color: 'rgba(255, 255, 255, 0.86)' },
});
