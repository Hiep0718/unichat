import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ContributionContext,
  DocumentResponse,
  fetchWorkspaceDocuments,
  uploadWorkspaceDocuments,
  deleteWorkspaceDocument,
} from '../document-api';
import { splitPdfFile } from '../utils/pdf-splitter';
import { ContributionModal } from './contribution-modal';
import { PdfSplitModal } from './pdf-split-modal';
import { SyncVectorModal } from './sync-vector-modal';
import { DocumentDeleteModal } from './document-delete-modal';
import { LoadingInline } from '../../../components/loading-screen';
import { Icon } from '../../../components/icon';
import { countReady, duplicatedNames } from '../document-status';
import { DocumentPagination } from './document-pagination';
import { DocumentRows } from './document-rows';
import { DocumentToast } from './document-toast';
import { DocumentUploadZone } from './document-upload-zone';

import type { DocumentNotice } from './document-toast';
import './document-table.css';

interface DocumentTableProps {
  workspaceId: string;
  /** May manage existing documents (delete). OWNER and EDITOR only. */
  canEdit: boolean;
  /**
   * May upload. Every active member can contribute; a contribution from a
   * member without {@link canEdit} is held for approval before the AI can use it.
   * Defaults to {@link canEdit} so existing call sites keep their behaviour.
   */
  canContribute?: boolean;
  /**
   * Bump to force a reload from outside — the approval queue changes document
   * statuses, and this table keeps its own local copy rather than sharing the
   * React Query cache.
   */
  reloadToken?: number;
}

interface UploadingDocument {
  id: string;
  name: string;
  size: number;
  mediaType: string;
  progress: number;
}

/** Stable empty list, so an unloaded table does not get a new array each render. */
const EMPTY_DOCUMENTS: DocumentResponse[] = [];

export const DocumentTable: React.FC<DocumentTableProps> = ({
  workspaceId,
  canEdit,
  canContribute = canEdit,
  reloadToken = 0,
}) => {
  // The list lives in the query cache, so reopening this tab paints from it
  // instead of showing "Đang tải" and refetching — the reason switching tabs
  // stuttered. Everything else here keeps its own state; only the list moved.
  const queryClient = useQueryClient();
  const documentsKey = useMemo(
    () => ['workspaces', workspaceId, 'documents', 'table'] as const,
    [workspaceId],
  );

  const {
    data: documents = EMPTY_DOCUMENTS,
    isPending: loading,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: documentsKey,
    queryFn: () => fetchWorkspaceDocuments(workspaceId).then((res) => res.content ?? []),
    enabled: Boolean(workspaceId),
  });

  /** Replaces the cached list, for the places that already had the new rows. */
  const setDocuments = useCallback(
    (next: DocumentResponse[]) => queryClient.setQueryData(documentsKey, next),
    [queryClient, documentsKey],
  );

  const [error, setError] = useState<string | null>(null);
  const listError =
    error ?? (loadError instanceof Error ? loadError.message : null);
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDocument[]>([]);
  const [notificationToast, setNotificationToast] = useState<DocumentNotice | null>(null);
  // Files waiting for the contributor to describe them before upload starts.
  const [pendingContribution, setPendingContribution] = useState<File[] | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentResponse | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalItems = documents.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [documents.length, currentPage, totalPages]);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return documents.slice(start, start + pageSize);
  }, [documents, currentPage, pageSize]);

  // Both count the whole group, not the current page: the heading speaks for
  // the group, and a name is no less duplicated for sitting on another page.
  const { ready, total } = useMemo(() => countReady(documents), [documents]);
  const duplicates = useMemo(() => duplicatedNames(documents), [documents]);

  // Oversized PDF Handling States
  const [oversizedFiles, setOversizedFiles] = useState<File[]>([]);
  const [isSplittingPdf, setIsSplittingPdf] = useState(false);
  const [splitProgressText, setSplitProgressText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // An approval decision upstream means the list is out of date.
  useEffect(() => {
    if (reloadToken > 0) void refetch();
  }, [reloadToken, refetch]);

  useEffect(() => {
    const isProcessing = documents.some(
      (doc) => doc.status === 'PENDING' || doc.status === 'PROCESSING'
    );

    if (!isProcessing && uploadingDocs.length === 0) {
      return;
    }

    const timer = setInterval(() => {
      loadDocuments();
    }, 5000);

    return () => clearInterval(timer);
  }, [documents, uploadingDocs, loadDocuments]);

  useEffect(() => {
    if (!notificationToast) return;
    const timer = setTimeout(() => {
      setNotificationToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notificationToast]);

  const uploadBatchFiles = async (targetFiles: File[], contribution?: ContributionContext) => {
    if (targetFiles.length === 0) return;

    const initialUploading: UploadingDocument[] = targetFiles.map((file, idx) => ({
      id: `${file.name}-${idx}-${Date.now()}`,
      name: file.name,
      size: file.size,
      mediaType: file.name.split('.').pop()?.toUpperCase() || 'FILE',
      progress: 10,
    }));

    setUploadingDocs((prev) => [...prev, ...initialUploading]);

    let currentProgress = 10;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + Math.floor(Math.random() * 10) + 5, 90);
      setUploadingDocs((prev) =>
        prev.map((doc) => ({ ...doc, progress: Math.max(doc.progress, currentProgress) }))
      );
    }, 150);

    try {
      await uploadWorkspaceDocuments(
        workspaceId,
        targetFiles,
        (fileIdx, percent) => {
          setUploadingDocs((prev) =>
            prev.map((doc, idx) => (idx === fileIdx ? { ...doc, progress: Math.max(doc.progress, percent) } : doc))
          );
        },
        contribution
      );

      clearInterval(progressInterval);
      setUploadingDocs((prev) => prev.map((doc) => ({ ...doc, progress: 100 })));
      await new Promise((r) => setTimeout(r, 400));

      const updated = await fetchWorkspaceDocuments(workspaceId);
      setDocuments(updated.content || []);

      setNotificationToast({
        type: 'success',
        title: 'Tải tài liệu thành công!',
        message: `Đã tải lên ${targetFiles.length} tài liệu thành công và sẵn sàng RAG Chat.`,
      });
    } catch (err: unknown) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : 'Không thể tải lên tài liệu';
      setError(msg);
      setNotificationToast({
        type: 'error',
        title: 'Tải tài liệu thất bại',
        message: msg,
      });
    } finally {
      setUploadingDocs([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const validFiles: File[] = [];
    const oversizedPdfs: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (!allowedExtensions.includes(ext)) {
        invalidFiles.push(`${file.name} (định dạng không hỗ trợ)`);
        return;
      }

      if (file.size <= 20 * 1024 * 1024) {
        validFiles.push(file);
      } else if (ext === '.pdf') {
        oversizedPdfs.push(file);
      } else {
        invalidFiles.push(`${file.name} (> 20 MB)`);
      }
    });

    if (invalidFiles.length > 0) {
      setError(`Các tệp không hợp lệ: ${invalidFiles.join(', ')}`);
    } else {
      setError(null);
    }

    if (oversizedPdfs.length > 0) {
      setOversizedFiles(oversizedPdfs);
    }

    if (validFiles.length > 0) {
      await startUpload(validFiles);
    }
  };

  /**
   * Members who cannot publish directly must explain the contribution first;
   * owners and editors upload straight away.
   */
  const startUpload = async (targetFiles: File[]) => {
    if (!canEdit) {
      setPendingContribution(targetFiles);
      return;
    }
    await uploadBatchFiles(targetFiles);
  };

  const handleConfirmSplit = async () => {
    if (oversizedFiles.length === 0) return;
    setIsSplittingPdf(true);

    try {
      const splitFiles: File[] = [];
      for (const file of oversizedFiles) {
        setSplitProgressText(`Đang xử lý & cắt tệp "${file.name}"...`);
        const parts = await splitPdfFile(file, 15, (p) => {
          setSplitProgressText(`"${file.name}": ${p.message}`);
        });
        splitFiles.push(...parts);
      }

      setOversizedFiles([]);
      setIsSplittingPdf(false);
      setSplitProgressText(null);

      if (splitFiles.length > 0) {
        await startUpload(splitFiles);
      }
    } catch (err: unknown) {
      setIsSplittingPdf(false);
      setSplitProgressText(null);
      const msg = err instanceof Error ? err.message : 'Không thể cắt tệp PDF';
      setError(`Lỗi cắt tệp PDF: ${msg}`);
    }
  };

  /** The zone owns dragging and the picker; this is the one way in. */
  const handlePickedFiles = (files: File[]) => {
    if (uploadingDocs.length > 0) return;
    processFiles(files);
  };

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleSyncVector = () => {
    setIsSyncModalOpen(true);
  };

  const handleDelete = (doc: DocumentResponse) => {
    setDeleteError(null);
    setDocumentToDelete(doc);
  };

  const confirmDelete = async () => {
    if (!documentToDelete || deletingDocumentId) return;
    const selectedDocument = documentToDelete;
    setDeletingDocumentId(selectedDocument.id);
    setDeleteError(null);
    try {
      await deleteWorkspaceDocument(workspaceId, selectedDocument.id);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Không thể xóa tài liệu');
      setDeletingDocumentId(null);
      return;
    }
    // Dropped from the cached list before the refetch lands, so the row goes
    // the moment the server confirms rather than one round trip later.
    setDocuments(documents.filter((doc) => doc.id !== selectedDocument.id));
    setDocumentToDelete(null);
    setDeletingDocumentId(null);
    try {
      const updated = await fetchWorkspaceDocuments(workspaceId);
      setDocuments(updated.content || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? `Đã gửi yêu cầu xóa nhưng không thể tải lại danh sách: ${err.message}`
          : 'Đã gửi yêu cầu xóa nhưng không thể tải lại danh sách.'
      );
    }
  };

  if (loading) return <LoadingInline label="Đang tải danh sách tài liệu..." />;

  const isUploading = uploadingDocs.length > 0;

  return (
    <div className="document-management">
      {pendingContribution && (
        <ContributionModal
          files={pendingContribution}
          onCancel={() => {
            setPendingContribution(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          onConfirm={(context) => {
            const files = pendingContribution;
            setPendingContribution(null);
            void uploadBatchFiles(files, context);
          }}
        />
      )}

      {oversizedFiles.length > 0 && (
        <PdfSplitModal
          files={oversizedFiles}
          isProcessing={isSplittingPdf}
          progressText={splitProgressText}
          onConfirm={handleConfirmSplit}
          onCancel={() => {
            setOversizedFiles([]);
            setIsSplittingPdf(false);
            setSplitProgressText(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
      )}

      {documentToDelete && (
        <DocumentDeleteModal
          key={documentToDelete.id}
          documentName={documentToDelete.originalName}
          isDeleting={deletingDocumentId === documentToDelete.id}
          error={deleteError}
          onCancel={() => {
            if (deletingDocumentId) return;
            setDocumentToDelete(null);
            setDeleteError(null);
          }}
          onConfirm={() => void confirmDelete()}
        />
      )}

      <DocumentToast notice={notificationToast} onClose={() => setNotificationToast(null)} />

      <SyncVectorModal
        isOpen={isSyncModalOpen}
        workspaceId={workspaceId}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncCompleted={async () => {
          const updated = await fetchWorkspaceDocuments(workspaceId);
          setDocuments(updated.content || []);
        }}
      />

      <header className="document-management__header">
        <div className="document-management__title-zone">
          <h2 className="document-management__title">Tài liệu của nhóm</h2>
          {/* Counted from the list already loaded: a file still being ingested
              is not one the assistant can read, so the total alone would
              overstate what it knows. */}
          <p className="document-management__subtitle">
            {total === 0
              ? 'Chưa có tệp nào trong nhóm.'
              : `${ready}/${total} tệp đã sẵn sàng cho Trợ lý AI`}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="document-management__sync-btn"
            onClick={handleSyncVector}
            title="Nạp lại toàn bộ tài liệu của nhóm cho trợ lý"
          >
            <Icon name="sync" size={18} />
            Đồng bộ lại
          </button>
        )}
      </header>

      {listError && (
        <p className="document-management__error" role="alert">
          <Icon name="error_outline" size={16} />
          {listError}
        </p>
      )}

      {canContribute && (
        <DocumentUploadZone
          isUploading={isUploading}
          uploadingCount={uploadingDocs.length}
          canEdit={canEdit}
          onFiles={handlePickedFiles}
        />
      )}

      {(paginatedDocs.length > 0 || uploadingDocs.length > 0) && (
        <DocumentRows
          documents={paginatedDocs}
          uploading={uploadingDocs}
          duplicates={duplicates}
          canEdit={canEdit}
          deleting={deletingDocumentId !== null}
          onDelete={handleDelete}
        />
      )}

      <DocumentPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPage={setCurrentPage}
        onPageSize={setPageSize}
      />
    </div>
  );
};
