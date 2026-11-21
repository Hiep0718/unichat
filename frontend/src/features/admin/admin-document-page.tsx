import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Icon } from '../../components/icon';
import { formatBytes } from '../../lib/format-bytes';
import { fetchAdminDocuments, retryAdminDocument } from './admin-api';

import type { AdminDocumentItem } from './admin-api';

const QUERY_KEY = ['admin', 'documents'] as const;

/** How each ingestion state reads, and the badge it is drawn as. */
const STATUS: Record<AdminDocumentItem['status'], { label: string; badge: string }> = {
  PROCESSED: { label: 'Đã nạp vector', badge: 'admin-badge--success' },
  FAILED: { label: 'Nạp lỗi', badge: 'admin-badge--failure' },
  PENDING: { label: 'Đang chờ', badge: 'admin-badge--denied' },
  PROCESSING: { label: 'Đang xử lý', badge: 'admin-badge--denied' },
  DELETING: { label: 'Đang xóa', badge: 'admin-badge--neutral' },
};

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

interface RowProps {
  readonly document: AdminDocumentItem;
  readonly retrying: boolean;
  readonly onRetry: (document: AdminDocumentItem) => void;
}

function DocumentRow({ document, retrying, onRetry }: RowProps) {
  const status = STATUS[document.status] ?? STATUS.PENDING;
  return (
    <tr>
      <td className="admin-page__cell-strong">{document.originalName}</td>
      <td>{document.mediaType}</td>
      <td>{formatBytes(document.byteSize)}</td>
      <td><span className={`admin-badge ${status.badge}`}>{status.label}</span></td>
      <td>{new Date(document.createdAt).toLocaleDateString('vi-VN')}</td>
      <td>
        <button type="button" className="admin-page__action" disabled={retrying} onClick={() => onRetry(document)}>
          <Icon name="replay" size={14} />
          {retrying ? 'Đang gửi lại…' : 'Thử lại'}
        </button>
      </td>
    </tr>
  );
}

/** Shows every document's ingestion state and lets an administrator requeue it. */
export function AdminDocumentPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, isPending } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAdminDocuments(0, 50),
  });

  const retry = useMutation({
    mutationFn: (doc: AdminDocumentItem) => retryAdminDocument(doc.id),
    onSuccess: (res) => {
      setNotice(res.message || 'Đã đưa tài liệu trở lại hàng đợi xử lý.');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => setActionError(messageOf(err, 'Không thể thử lại việc nạp tài liệu.')),
  });

  const handleRetry = (doc: AdminDocumentItem) => {
    setNotice(null);
    setActionError(null);
    retry.mutate(doc);
  };

  const documents = data?.content ?? [];

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h2>Quản trị tài liệu</h2>
        <p>Theo dõi trạng thái bóc tách và nhúng vector, thử lại tệp lỗi mà người dùng không phải tải lên lại.</p>
      </header>

      {isPending && <p className="admin-page__notice" role="status">Đang tải danh sách tài liệu…</p>}
      {error && <p className="admin-page__error" role="alert">{messageOf(error, 'Không tải được danh sách tài liệu.')}</p>}
      {actionError && <p className="admin-page__error" role="alert">{actionError}</p>}
      {notice && <p className="admin-page__notice" role="status">{notice}</p>}

      <div className="admin-page__card">
        <table>
          <thead>
            <tr><th>Tên tài liệu</th><th>Định dạng</th><th>Kích thước</th><th>Trạng thái</th><th>Ngày nạp</th><th>Thao tác</th></tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <DocumentRow key={d.id} document={d}
                retrying={retry.isPending && retry.variables?.id === d.id} onRetry={handleRetry} />
            ))}
          </tbody>
        </table>
        {!isPending && !error && documents.length === 0 && (
          <p className="admin-page__empty">Chưa có tài liệu nào trong hệ thống.</p>
        )}
      </div>
    </section>
  );
}

export default AdminDocumentPage;
