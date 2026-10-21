import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminAuditEvents } from './admin-api';
import { getSessionSnapshot } from '../../lib/session-store';

/** Reads metadata-only audit pages with explicit filters and failures. */
export function AdminAuditPage() {
  const [page, setPage] = useState(0);
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const { data, error, isPending, isFetching } = useQuery({ retry: false,
    queryKey: ['admin-audit', getSessionSnapshot().generation, page, action, outcome],
    queryFn: () => fetchAdminAuditEvents(page, action, outcome) });
  return <section className="admin-page"><header className="admin-page__header"><h2>Nhật ký Kiểm toán</h2>
    <p>Theo dõi sự kiện quản trị và xác thực ở dạng metadata.</p></header>
    <div className="admin-page__toolbar"><label>Hành động <select value={action} onChange={(event) => { setAction(event.target.value); setPage(0); }}>
      <option value="">Tất cả</option>{['AUTH_LOGIN_SUCCESS', 'AUTH_LOGIN_FAILURE', 'CHAT_COMPLETED', 'CHAT_FAILED', 'CHAT_CANCELLED', 'ADMIN_KEY_PROBE'].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label>Kết quả <select value={outcome} onChange={(event) => { setOutcome(event.target.value); setPage(0); }}>
      <option value="">Tất cả</option>{['SUCCESS', 'FAILURE', 'DENIED'].map((value) => <option key={value}>{value}</option>)}</select></label></div>
    {isPending && <p className="admin-page__notice" role="status">Đang tải nhật ký…</p>}{error && <p className="admin-page__error" role="alert">{error.message}</p>}
    <div className="admin-page__card"><table><thead><tr><th>Thời gian</th><th>Actor</th><th>Hành động</th><th>Đối tượng</th><th>Kết quả</th><th>Request ID</th></tr></thead>
      <tbody>{data?.content.map((event) => <tr key={event.id}><td>{new Date(event.occurredAt).toLocaleString('vi-VN')}</td>
        <td>{event.actorId ?? 'Ẩn danh'}</td><td>{event.action}</td><td>{event.targetType}</td><td>{event.outcome}</td><td>{event.requestId}</td></tr>)}</tbody></table></div>
    {data?.content.length === 0 && <p>Chưa có sự kiện phù hợp.</p>}
    <button disabled={page === 0 || isFetching} onClick={() => setPage(page - 1)}>Trang trước</button>
    <span> Trang {page + 1} / {data?.totalPages || 1} </span>
    <button disabled={!data || page + 1 >= data.totalPages || isFetching} onClick={() => setPage(page + 1)}>Trang tiếp</button>
  </section>;
}
export default AdminAuditPage;
