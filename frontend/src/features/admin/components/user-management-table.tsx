import { useAuth } from '../../auth/auth-context';
import { useAdminUsers } from '../use-admin-users';
import { AdminUserRow } from './admin-user-row';
import './user-management-table.css';

/** Shows server pagination and versioned role/status mutations with visible failures. */
export function UserManagementTable() {
  const { user } = useAuth();
  const state = useAdminUsers();
  const { data, error, isPending, isFetching, refetch } = state.result;
  return <section className="admin-management"><h2>Danh sách Người dùng Hệ thống</h2>
    <label>Tìm kiếm email <input value={state.search} maxLength={254} onChange={(event) => state.setSearch(event.target.value)} /></label>
    <p>Tổng kết quả: {data?.totalElements ?? '—'}</p>
    {(error || state.mutationError) && <p role="alert">{state.mutationError ?? error?.message}</p>}
    <button type="button" disabled={isFetching} onClick={() => void refetch()}>Tải lại</button>
    {isPending ? <p role="status">Đang tải danh sách người dùng…</p> : <table className="admin-table">
      <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
      <tbody>{data?.content.map((account) => <AdminUserRow key={account.id} user={account} ownId={user?.id}
        busy={state.pending !== null} mutate={state.mutate} />)}</tbody>
    </table>}
    {data?.content.length === 0 && <p>Không có người dùng phù hợp.</p>}
    <nav aria-label="Phân trang người dùng"><button disabled={state.page === 0 || isFetching} onClick={() => state.setPage(state.page - 1)}>Trang trước</button>
      <span> Trang {state.page + 1} / {data?.totalPages || 1} </span>
      <button disabled={!data || state.page + 1 >= data.totalPages || isFetching} onClick={() => state.setPage(state.page + 1)}>Trang tiếp</button></nav>
  </section>;
}
