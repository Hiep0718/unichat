import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, radii } from '../../design/tokens';
import { typography } from '../../design/typography';
import { UCIcon } from '../../components/uc-icon';
import { useToast } from '../../lib/toast-context';
import { workspaceApi } from '../workspaces/workspace-api';

interface DocumentUploadProps {
  workspaceId: string;
  onUploadSuccess: () => void;
}

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MiB per api-contracts.md

export function DocumentUpload({ workspaceId, onUploadSuccess }: DocumentUploadProps) {
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];

      if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
        showToast({
          message: 'Dung lượng file vượt quá giới hạn 20 MiB',
          type: 'error',
        });
        return;
      }

      setUploading(true);
      await workspaceApi.uploadDocument(workspaceId, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });

      showToast({
        message: 'Tải tài liệu lên thành công! AI đang xử lý nội dung.',
        type: 'success',
      });
      onUploadSuccess();
    } catch (err: any) {
      showToast({
        message: err.message || 'Không thể tải lên tài liệu',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.uploadBox}
      onPress={handlePickAndUpload}
      disabled={uploading}
      activeOpacity={0.8}
      testID="upload-doc-button"
    >
      {uploading ? (
        <View style={styles.centerRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.uploadingText}>Đang tải lên và gửi xử lý...</Text>
        </View>
      ) : (
        <View style={styles.centerRow}>
          <View style={styles.iconCircle}>
            <UCIcon name="cloud-upload" size={20} color={colors.primary} />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.uploadTitle}>Tải lên tài liệu mới</Text>
            <Text style={styles.uploadSub}>PDF, DOCX hoặc TXT (tối đa 20 MiB)</Text>
          </View>
          <UCIcon name="add" size={20} color={colors.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  uploadBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
  },
  uploadTitle: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
  uploadSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  uploadingText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: '600',
  },
});
