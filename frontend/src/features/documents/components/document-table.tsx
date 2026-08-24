import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DocumentResponse,
  fetchWorkspaceDocuments,
  uploadWorkspaceDocuments,
  deleteWorkspaceDocument,
} from '../document-api';
import { splitPdfFile } from '../utils/pdf-splitter';
import { PdfSplitModal } from './pdf-split-modal';
import { SyncVectorModal } from './sync-vector-modal';
import { LoadingInline } from '../../../components/loading-screen';
import './document-table.css';

interface DocumentTableProps {
  workspaceId: string;
  canEdit: boolean;
}

interface UploadingDocument {
  id: string;
  name: string;
  size: number;
  mediaType: string;
  progress: number;
}

interface NotificationToast {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({ workspaceId, canEdit }) => {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState<UploadingDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notificationToast, setNotificationToast] = useState<NotificationToast | null>(null);

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

  // Oversized PDF Handling States
  const [oversizedFiles, setOversizedFiles] = useState<File[]>([]);
  const [isSplittingPdf, setIsSplittingPdf] = useState(false);
  const [splitProgressText, setSplitProgressText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorkspaceDocuments(workspaceId);
      setDocuments(res.content || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;
    fetchWorkspaceDocuments(workspaceId)
      .then((res) => {
        if (isMounted) {
          setDocuments(res.content || []);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Lỗi tải danh sách tài liệu');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

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

  const uploadBatchFiles = async (targetFiles: File[]) => {
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
      await uploadWorkspaceDocuments(workspaceId, targetFiles, (fileIdx, percent) => {
        setUploadingDocs((prev) =>
          prev.map((doc, idx) => (idx === fileIdx ? { ...doc, progress: Math.max(doc.progress, percent) } : doc))
        );
      });

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
      await uploadBatchFiles(validFiles);
    }
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
        await uploadBatchFiles(splitFiles);
      }
    } catch (err: unknown) {
      setIsSplittingPdf(false);
      setSplitProgressText(null);
      const msg = err instanceof Error ? err.message : 'Không thể cắt tệp PDF';
      setError(`Lỗi cắt tệp PDF: ${msg}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadingDocs.length === 0) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploadingDocs.length > 0) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleSyncVector = () => {
    setIsSyncModalOpen(true);
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    try {
      await deleteWorkspaceDocument(workspaceId, documentId);
      const updated = await fetchWorkspaceDocuments(workspaceId);
      setDocuments(updated.content || []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Không thể xóa tài liệu');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <LoadingInline label="Đang tải danh sách tài liệu..." />;

  const isUploading = uploadingDocs.length > 0;

  return (
    <div className="document-management">
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

      {notificationToast &&
        createPortal(
          <div className={`doc-toast doc-toast--${notificationToast.type}`}>
            <div className={`doc-toast__icon doc-toast__icon--${notificationToast.type}`}>
              {notificationToast.type === 'success' ? '✓' : '✕'}
            </div>
            <div className="doc-toast__body">
              <h5 className="doc-toast__title">{notificationToast.title}</h5>
              <p className="doc-toast__message">{notificationToast.message}</p>
            </div>
            <button
              className="doc-toast__close"
              onClick={() => setNotificationToast(null)}
              title="Đóng thông báo"
            >
              &times;
            </button>
          </div>,
          document.body
        )}

      <SyncVectorModal
        isOpen={isSyncModalOpen}
        workspaceId={workspaceId}
        onClose={() => setIsSyncModalOpen(false)}
        onSyncCompleted={async () => {
          const updated = await fetchWorkspaceDocuments(workspaceId);
          setDocuments(updated.content || []);
        }}
      />

      <div className="document-management__header">
        <div className="document-management__title-zone">
          <h3 className="document-management__title">Tài liệu Workspace ({documents.length})</h3>
        </div>
        <button
          type="button"
          className="document-management__sync-btn"
          onClick={handleSyncVector}
          title="Đồng bộ tất cả tài liệu đĩa sang ChromaDB Vector Store"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            cloud_sync
          </span>
          <span>Đồng bộ Vector DB</span>
        </button>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '1rem' }}>{error}</div>}

      {canEdit && (
        <div
          className={`document-upload-zone ${isDragging ? 'document-upload-zone--dragging' : ''}`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ opacity: isUploading ? 0.6 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.txt"
            multiple
            disabled={isUploading}
          />
          <div className="document-upload-zone__title">
            {isUploading
              ? `Đang tải lên ${uploadingDocs.length} tài liệu...`
              : 'Nhấp hoặc kéo thả nhiều tệp PDF, DOCX, TXT để tải lên cùng lúc'}
          </div>
          <div className="document-upload-zone__subtitle">
            Hỗ trợ upload hàng loạt tệp • Dung lượng tối đa 20 MiB/tệp
          </div>
        </div>
      )}

      <div className="document-table-container">
        <table className="document-table">
          <thead>
            <tr>
              <th>Tên tài liệu</th>
              <th>Định dạng</th>
              <th>Dung lượng</th>
              <th>Trạng thái Vector DB</th>
              {canEdit && <th>Hành động</th>}
            </tr>
          </thead>
          <tbody>
            {uploadingDocs.map((doc) => (
              <tr key={doc.id} className="document-row--uploading">
                <td>
                  <div className="document-uploading-info">
                    <span className="document-uploading-name">{doc.name}</span>
                    <div className="document-progress-bar-container">
                      <div
                        className="document-progress-bar-fill"
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td>{doc.mediaType}</td>
                <td>{formatSize(doc.size)}</td>
                <td>
                  <span className="document-badge document-badge--uploading">
                    <span className="document-badge__icon">⏳</span>
                    Đang nạp Vector ({doc.progress}%)
                  </span>
                </td>
                {canEdit && <td>—</td>}
              </tr>
            ))}

            {paginatedDocs.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.originalName}</td>
                <td>{doc.mediaType.split('/')[1]?.toUpperCase() || doc.mediaType}</td>
                <td>{formatSize(doc.byteSize)}</td>
                <td>
                  <span className={`document-badge document-badge--${doc.status.toLowerCase()}`}>
                    <span className="document-badge__icon">
                      {doc.status === 'PROCESSED' ? '✓' : doc.status === 'FAILED' ? '✕' : '⏳'}
                    </span>
                    {doc.status === 'PROCESSED'
                      ? 'Vector DB Ready'
                      : doc.status === 'PROCESSING'
                      ? 'Tách Vector...'
                      : doc.status === 'FAILED'
                      ? 'Lỗi Vector'
                      : 'Chưa nạp Vector'}
                  </span>
                </td>
                {canEdit && (
                  <td>
                    <button className="document-delete-btn" onClick={() => handleDelete(doc.id)}>
                      Xóa
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {documents.length > 0 && (
          <div className="document-pagination">
            <div className="document-pagination__info">
              <span>
                Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> trong tổng số{' '}
                <strong>{totalItems}</strong> tài liệu
              </span>
              <select
                className="document-pagination__size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5 dòng / trang</option>
                <option value={10}>10 dòng / trang</option>
                <option value={20}>20 dòng / trang</option>
                <option value={50}>50 dòng / trang</option>
              </select>
            </div>

            <div className="document-pagination__controls">
              <button
                type="button"
                className="document-pagination__btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="Trang đầu"
              >
                «
              </button>
              <button
                type="button"
                className="document-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Trang trước"
              >
                ‹
              </button>
              <span className="document-pagination__page-indicator">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="document-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                title="Trang sau"
              >
                ›
              </button>
              <button
                type="button"
                className="document-pagination__btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                title="Trang cuối"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
