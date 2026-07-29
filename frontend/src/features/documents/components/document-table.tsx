import React, { useState, useEffect, useRef } from 'react';
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

export const DocumentTable: React.FC<DocumentTableProps> = ({ workspaceId, canEdit }) => {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      await uploadWorkspaceDocument(workspaceId, file);
      const updated = await fetchWorkspaceDocuments(workspaceId);
      setDocuments(updated.content || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải lên tài liệu');
    } finally {
      setUploading(false);
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
      <div className="document-management__header">
        <h3 className="document-management__title">Tài liệu Workspace ({documents.length})</h3>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: '14px' }}>{error}</div>}

      {canEdit && (
        <div className="document-upload-zone" onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.docx,.txt"
          />
          <div className="document-upload-zone__title">
            {uploading ? 'Đang tải tệp lên...' : 'Nhấp để chọn tệp PDF, DOCX, TXT tải lên'}
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
