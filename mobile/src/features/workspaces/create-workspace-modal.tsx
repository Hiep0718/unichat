import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { z } from 'zod';
import { colors, spacing, radii } from '../../design/tokens';
import { typography } from '../../design/typography';
import { UCButton } from '../../components/uc-button';
import { UCTextInput } from '../../components/uc-text-input';
import { UCIcon } from '../../components/uc-icon';
import { useToast } from '../../lib/toast-context';
import { workspaceApi } from './workspace-api';
import { WorkspaceItem } from './workspace-types';

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(3, 'Tên không gian phải có ít nhất 3 ký tự')
    .max(100, 'Tên không gian không được vượt quá 100 ký tự'),
  description: z
    .string()
    .max(1000, 'Mô tả không được vượt quá 1000 ký tự')
    .optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
});

interface CreateWorkspaceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (workspace: WorkspaceItem) => void;
}

export function CreateWorkspaceModal({
  visible,
  onClose,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleCreate = async () => {
    setErrors({});
    const result = createWorkspaceSchema.safeParse({ name, description, visibility });

    if (!result.success) {
      const fieldErrors: { name?: string; description?: string } = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0] === 'name') fieldErrors.name = issue.message;
        if (issue.path[0] === 'description') fieldErrors.description = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setLoading(true);
      const newWs = await workspaceApi.createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      showToast({ message: 'Tạo không gian làm việc thành công!', type: 'success' });
      setName('');
      setDescription('');
      onSuccess(newWs);
      onClose();
    } catch (err: any) {
      showToast({
        message: err.message || 'Không thể tạo không gian làm việc',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Tạo Không gian mới</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <UCIcon name="close" size={22} color={colors.outline} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <UCTextInput
              label="Tên không gian *"
              placeholder="VD: Nhập môn Trí tuệ Nhân tạo"
              value={name}
              onChangeText={setName}
              error={errors.name}
            />

            <UCTextInput
              label="Mô tả"
              placeholder="Mục tiêu môn học, đề cương..."
              value={description}
              onChangeText={setDescription}
              error={errors.description}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.sectionLabel}>Quyền riêng tư</Text>
            <View style={styles.radioRow}>
              <TouchableOpacity
                style={[styles.radioCard, visibility === 'PRIVATE' && styles.radioActive]}
                onPress={() => setVisibility('PRIVATE')}
              >
                <UCIcon
                  name="lock"
                  size={18}
                  color={visibility === 'PRIVATE' ? colors.primary : colors.outline}
                />
                <Text style={[styles.radioText, visibility === 'PRIVATE' && styles.radioTextActive]}>
                  Riêng tư
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioCard, visibility === 'PUBLIC' && styles.radioActive]}
                onPress={() => setVisibility('PUBLIC')}
              >
                <UCIcon
                  name="public"
                  size={18}
                  color={visibility === 'PUBLIC' ? colors.primary : colors.outline}
                />
                <Text style={[styles.radioText, visibility === 'PUBLIC' && styles.radioTextActive]}>
                  Công khai
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <UCButton
                title="Hủy"
                variant="outline"
                onPress={onClose}
                disabled={loading}
                style={styles.flexBtn}
              />
              <UCButton
                title="Tạo không gian"
                variant="primary"
                onPress={handleCreate}
                loading={loading}
                style={styles.flexBtn}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  radioCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainer,
  },
  radioText: {
    ...typography.labelMd,
    color: colors.outline,
  },
  radioTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  flexBtn: {
    flex: 1,
  },
});
