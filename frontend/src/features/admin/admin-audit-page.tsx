import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminAuditEvents } from './admin-api';
import { getSessionSnapshot } from '../../lib/session-store';
import { SelectMenu } from '../../components/select-menu';

import type { SelectMenuOption } from '../../components/select-menu';

const AUDIT_ACTIONS = [
  'AUTH_LOGIN_SUCCESS',
  'AUTH_LOGIN_FAILURE',
  'CHAT_COMPLETED',
  'CHAT_FAILED',
  'CHAT_CANCELLED',
  'ADMIN_KEY_PROBE',
] as const;

const AUDIT_OUTCOMES = ['SUCCESS', 'FAILURE', 'DENIED'] as const;

/** Prepends the "no filter" choice, stored as an empty string. */
function withAll(values: readonly string[]): readonly SelectMenuOption<string>[] {
  return [{ value: '', label: 'Tất cả' }, ...values.map((value) => ({ value, label: value }))];
}

/** Reads metadata-only audit pages with explicit filters and failures. */
export function AdminAuditPage() {
  const [page, setPage] = useState(0);
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const { data, error, isPending, isFetching } = useQuery({
    retry: false,
    queryKey: ['admin-audit', getSessionSnapshot().generation, page, action, outcome],
    queryFn: () => fetchAdminAuditEvents(page, action, outcome),
  });

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h2>Nhật ký Kiểm toán</h2>
        <p>Theo dõi sự kiện quản trị và xác thực ở dạng metadata.</p>
      </header>

      <div className="admin-page__toolbar">
        <label>
          Hành động
          <SelectMenu
            variant="field"
            label="Hành động"
            value={action}
            options={withAll(AUDIT_ACTIONS)}
            onChange={(value) => {
              setAction(value);
              setPage(0);
            }}
          />
        </label>

        <label>
          Kết quả
          <SelectMenu
            variant="field"
            label="Kết quả"
            value={outcome}
            options={withAll(AUDIT_OUTCOMES)}
            onChange={(value) => {
              setOutcome(value);
              setPage(0);
            }}
          />
        </label>
      </div>

      {isPending && <p className="admin-page__notice" role="status">Đang tải nhật ký…</p>}
      {error && <p className="admin-page__error" role="alert">{error.message}</p>}

      <div className="admin-page__card">
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Actor</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Kết quả</th>
              <th>Request ID</th>
            </tr>
          </thead>
          <tbody>
            {data?.content.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.occurredAt).toLocaleString('vi-VN')}</td>
                <td>{event.actorId ?? 'Ẩn danh'}</td>
                <td>
                  <span style={{ fontWeight: 600 }}>{event.action}</span>
                </td>
                <td>{event.targetType}</td>
                <td>
                  <span className={`admin-badge admin-badge--${event.outcome.toLowerCase()}`}>
                    {event.outcome}
                  </span>
                </td>
                <td>
                  <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                    {event.requestId}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.content.length === 0 && <p className="admin-page__notice">Chưa có sự kiện phù hợp.</p>}

      <nav className="admin-pagination-bar" aria-label="Phân trang kiểm toán">
        <button disabled={page === 0 || isFetching} onClick={() => setPage(page - 1)}>
          Trang trước
        </button>
        <span>
          Trang {page + 1} / {data?.totalPages || 1}
        </span>
        <button disabled={!data || page + 1 >= data.totalPages || isFetching} onClick={() => setPage(page + 1)}>
          Trang tiếp
        </button>
      </nav>
    </section>
  );
}

export default AdminAuditPage;
