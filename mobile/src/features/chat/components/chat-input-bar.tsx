import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../../../design/tokens';
import { typography } from '../../../design/typography';
import { UCIcon } from '../../../components/uc-icon';

interface ChatInputBarProps {
  onSend: (text: string, allowExternalKnowledge?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  allowExternalKnowledge?: boolean;
  onToggleExternalKnowledge?: (val: boolean) => void;
}

export function ChatInputBar({
  onSend,
  disabled = false,
  placeholder = 'Hỏi UniChat...',
  allowExternalKnowledge = false,
  onToggleExternalKnowledge,
}: ChatInputBarProps) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [externalKnowledge, setExternalKnowledge] = useState(allowExternalKnowledge);

  const handleToggle = () => {
    const newVal = !externalKnowledge;
    setExternalKnowledge(newVal);
    onToggleExternalKnowledge?.(newVal);
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    onSend(trimmed, externalKnowledge);
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={[styles.outerContainer, { paddingBottom: Math.max(insets.bottom, 12) + spacing.xs }]}>
      {/* Gemini Floating Pill Dock */}
      <View style={styles.geminiFloatingDock}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={85} tint="systemThinMaterialLight" style={StyleSheet.absoluteFill} />
        ) : null}

        {/* Specular Edge Highlight */}
        <View style={styles.specularHighlight} />

        {/* Plus / Knowledge Mode Button */}
        <TouchableOpacity
          style={[styles.plusButton, externalKnowledge && styles.plusButtonActive]}
          onPress={handleToggle}
          activeOpacity={0.7}
        >
          <UCIcon
            name={externalKnowledge ? 'public' : 'add'}
            size={18}
            color={externalKnowledge ? '#00687A' : colors.onSurfaceVariant}
          />
        </TouchableOpacity>

        {/* Center Input Field */}
        <TextInput
          style={styles.geminiInput}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          editable={!disabled}
          testID="chat-text-input"
        />

        {/* Clear Button if typed */}
        {text.length > 0 && !disabled && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => setText('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <UCIcon name="close" size={16} color={colors.outline} />
          </TouchableOpacity>
        )}

        {/* Right Actions: Mic + Audio OR Send Button */}
        {canSend ? (
          <TouchableOpacity
            style={styles.sendButtonActive}
            onPress={handleSend}
            activeOpacity={0.85}
            testID="chat-send-button"
          >
            <LinearGradient
              colors={['#00236F', '#00687A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendButtonGradient}
            >
              <UCIcon name="arrow-upward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.geminiIdleActions}>
            <TouchableOpacity
              style={styles.micButton}
              activeOpacity={0.7}
              onPress={() => {
                if (Platform.OS === 'ios') Haptics.selectionAsync();
              }}
            >
              <UCIcon name="mic" size={20} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.waveformButton}
              activeOpacity={0.75}
              testID="chat-send-button"
              disabled
            >
              <View style={styles.waveformBadge}>
                <UCIcon name="graphic-eq" size={16} color="#00687A" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Mode Hint Text below dock if external knowledge enabled */}
      {externalKnowledge ? (
        <Text style={styles.modeHintText}>
          🌐 Đang bật tri thức mở rộng kết hợp RAG giáo trình
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  geminiFloatingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    minHeight: 52,
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  specularHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.2,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  plusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginRight: 4,
  },
  plusButtonActive: {
    backgroundColor: 'rgba(0, 104, 122, 0.12)',
  },
  geminiInput: {
    ...typography.bodyMd,
    flex: 1,
    color: '#0F172A',
    maxHeight: 110,
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
    fontSize: 15,
  },
  clearBtn: {
    padding: 6,
  },
  sendButtonActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginLeft: 4,
  },
  sendButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00236F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  geminiIdleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
  },
  micButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 104, 122, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeHintText: {
    textAlign: 'center',
    fontSize: 10.5,
    color: '#00687A',
    fontWeight: '600',
    marginTop: 4,
  },
});
