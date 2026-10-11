import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { spacing } from '../../../src/design/tokens';
import { UCScreenContainer } from '../../../src/components/uc-screen-container';
import { UCSkeletonList } from '../../../src/components/uc-skeleton';
import { useToast } from '../../../src/lib/toast-context';
import { workspaceApi } from '../../../src/features/workspaces/workspace-api';
import { DocumentItem } from '../../../src/features/workspaces/workspace-types';
import { DocumentList } from '../../../src/features/documents/document-list';
import { DocumentUpload } from '../../../src/features/documents/document-upload';
import { isValidUuid } from '../../../src/lib/uuid';

export default function WorkspaceDocumentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!isValidUuid(id)) {
      setLoading(false);
      return;
    }
    try {
      const res = await workspaceApi.getWorkspaceDocuments(id);
      setDocuments(res.content || []);
    } catch (err: any) {
      showToast({ message: err.message || 'Không thể tải danh sách tài liệu', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const handleDelete = async (documentId: string) => {
    if (!id) return;
    try {
      await workspaceApi.deleteDocument(id, documentId);
      showToast({ message: 'Đã xóa tài liệu', type: 'success' });
      await loadDocuments();
    } catch (err: any) {
      showToast({ message: err.message || 'Không thể xóa tài liệu', type: 'error' });
    }
  };

  return (
    <UCScreenContainer>
      <View style={styles.container}>
        {id && <DocumentUpload workspaceId={id} onUploadSuccess={loadDocuments} />}

        {loading ? (
          <UCSkeletonList count={4} />
        ) : (
          <DocumentList
            documents={documents}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onDelete={handleDelete}
          />
        )}
      </View>
    </UCScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
