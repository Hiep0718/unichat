import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DocumentResponse,
  fetchWorkspaceDocuments,
  uploadWorkspaceDocument,
  deleteWorkspaceDocument,
} from '../document-api';
import './document-table.css';

interface DocumentTableProps {
  workspaceId: string;
  canEdit: boolean;
}

interface UploadingDocument {
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
  const [uploadingDoc, setUploadingDoc] = useState<UploadingDocument | null>(null);
  const [notificationToast, setNotificationToast] = useState<NotificationToast | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!notificationToast) return;
    const timer = setTimeout(() => {
      setNotificationToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notificationToast]);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toUpperCase() || 'FILE';

    setUploadingDoc({
      name: file.name,
      size: file.size,
      mediaType: fileExt,
      progress: 10,
    });
    setError(null);

    let currentProgress = 10;
    const progressInterval = setInterval(() => {
      currentProgress = Math.min(currentProgress + Math.floor(Math.random() * 12) + 8, 92);
      setUploadingDoc((prev) => (prev ? { ...prev, progress: currentProgress } : null));
    }, 120);

    try {
      await uploadWorkspaceDocument(workspaceId, file, (percent) => {
        if (percent > currentProgress) {
          currentProgress = Math.min(percent, 95);
        }
      });

      clearInterval(progressInterval);
      setUploadingDoc((prev) => (prev ? { ...prev, progress: 100 } : null));
      await new Promise((r) => setTimeout(r, 450));

      const updated = await fetchWorkspaceDocuments(workspaceId);
      setDocuments(updated.content || []);

      setNotificationToast({
        type: 'success',
        title: 'Tải tài liệu thành công!',
        message: `Tài liệu "${file.name}" đã tải lên sẵn sàng RAG Chat.`,
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
      setUploadingDoc(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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

  if (loading) return <div className="document-management">Đang tải danh sách tài liệu...</div>;

  return (
    <div className="document-management">
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
              ×
            </button>
            <div className="doc-toast__timer-bar" />
          </div>,
          document.body
        )}



      <div className="document-management__header">
        <h3 className="document-management__title">Tài liệu Workspace ({documents.length})</h3>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '1rem' }}>{error}</div>}

      {canEdit && (
        <div
          className="document-upload-zone"
          onClick={() => !uploadingDoc && fileInputRef.current?.click()}
          style={{ opacity: uploadingDoc ? 0.6 : 1, cursor: uploadingDoc ? 'not-allowed' : 'pointer' }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.txt"
            disabled={Boolean(uploadingDoc)}
          />
          <div className="document-upload-zone__title">
            {uploadingDoc ? `Đang tải tệp lên (${uploadingDoc.progress}%)...` : 'Nhấp để chọn tệp PDF, DOCX, TXT tải lên'}
          </div>
          <div className="document-upload-zone__subtitle">Dung lượng tối đa 20 MiB/tệp</div>
        </div>
      )}

      <div className="document-table-container">
        <table className="document-table">
          <thead>
            <tr>
              <th>Tên tài liệu</th>
              <th>Định dạng</th>
              <th>Dung lượng</th>
              <th>Trạng thái</th>
              {canEdit && <th>Hành động</th>}
            </tr>
          </thead>
          <tbody>
            {uploadingDoc && (
              <tr className="document-row--uploading">
                <td>
                  <div className="document-uploading-info">
                    <span className="document-uploading-name">{uploadingDoc.name}</span>
                    <div className="document-progress-bar-container">
                      <div
                        className="document-progress-bar-fill"
                        style={{ width: `${uploadingDoc.progress}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td>{uploadingDoc.mediaType}</td>
                <td>{formatSize(uploadingDoc.size)}</td>
                <td>
                  <span className="document-badge document-badge--uploading">
                    Đang tải ({uploadingDoc.progress}%)
                  </span>
                </td>
                {canEdit && <td>—</td>}
              </tr>
            )}

            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.originalName}</td>
                <td>{doc.mediaType.split('/')[1]?.toUpperCase() || doc.mediaType}</td>
                <td>{formatSize(doc.byteSize)}</td>
                <td>
                  <span className={`document-badge document-badge--${doc.status.toLowerCase()}`}>
                    {doc.status}
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
      </div>
    </div>
  );
};


