import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { spacing, radii, palette } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';
import { SseThoughtPayload } from '../../../types/api';

interface ThinkingIndicatorProps {
  thoughtSteps: SseThoughtPayload[];
}

export function ThinkingIndicator({ thoughtSteps }: ThinkingIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const pulse = useSharedValue(0.4);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.95 + pulse.value * 0.1 }],
  }));

  const hasSteps = thoughtSteps.length > 0;

  return (
    <View style={styles.container} testID="thinking-indicator">
      {/* Specular top highlight */}
      <View style={styles.specularHighlight} />

      <TouchableOpacity
        style={styles.header}
        onPress={() => hasSteps && setExpanded((prev) => !prev)}
        activeOpacity={hasSteps ? 0.7 : 1}
      >
        <Animated.View style={[styles.iconWrap, animatedStyle]}>
          <UCIcon name="auto-awesome" size={16} color={palette.nhan} />
        </Animated.View>

        <Text style={styles.headerText}>
          {hasSteps
            ? `Đang suy luận... (${thoughtSteps.length} bước)`
            : 'Đang tra cứu tài liệu học tập...'}
        </Text>

        {hasSteps && (
          <View style={styles.togglePill}>
            <UCIcon
              name={expanded ? 'expand-less' : 'expand-more'}
              size={16}
              color={palette.nhan}
            />
          </View>
        )}
      </TouchableOpacity>

      {expanded && hasSteps && (
        <View style={styles.stepsBox}>
          {thoughtSteps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepTimeline}>
                <View style={styles.stepDot}>
                  <Text style={styles.stepDotIndex}>{idx + 1}</Text>
                </View>
                {idx < thoughtSteps.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title || step.stepKey}</Text>
                {step.detail ? (
                  <Text style={styles.stepDetail}>{step.detail}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Bảng teal cũ đã bỏ ở web; trạng thái của trợ lý dùng màu nhấn nhạt,
    // không bóng đổ ở trạng thái nghỉ.
    backgroundColor: palette.nhanNhat,
    borderRadius: radii.xl,
    marginVertical: spacing.xs + 2,
    overflow: 'hidden',
    position: 'relative',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.nen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    ...typography.labelSm,
    color: palette.nhan,
    fontWeight: '700',
    flex: 1,
    fontSize: 12.5,
  },
  togglePill: {
    padding: 2,
  },
  stepsBox: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: palette.vien,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepTimeline: {
    alignItems: 'center',
    width: 20,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.nhan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotIndex: {
    fontSize: 10,
    fontWeight: '700',
    color: palette.nhanMuc,
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: palette.vien,
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  stepTitle: {
    ...typography.labelSm,
    color: palette.muc,
    fontWeight: '700',
    fontSize: 12,
  },
  stepDetail: {
    ...typography.bodySm,
    color: palette.mucNhat,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
});
