import { useAuth } from '../../auth/auth-context';
import { useAdminUsers } from '../use-admin-users';
import { AdminUserRow } from './admin-user-row';
import './user-management-table.css';

/** Shows server pagination and versioned role/status mutations with visible failures. */
export function UserManagementTable() {
  const { user } = useAuth();
  const state = useAdminUsers();
  const { data, error, isPending, isFetching, refetch } = state.result;

  return (
    <section className="admin-management">
      <div className="admin-management__box">
        <div className="admin-management__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 className="admin-management__title">Danh sách Người dùng Hệ thống</h2>
            <span style={{ fontSize: '0.8125rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '9999px', fontWeight: 600 }}>
              Tổng: {data?.totalElements ?? '—'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label className="admin-search-wrapper">
              <span className="sr-only">Tìm kiếm email</span>
              <input
                className="admin-search-input"
                placeholder="Tìm kiếm theo email..."
                value={state.search}
                maxLength={254}
                onChange={(event) => state.setSearch(event.target.value)}
              />
            </label>
            <button
              className="admin-refresh-btn"
              type="button"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>refresh</span>
              Tải lại
            </button>
          </div>
        </div>

        {(error || state.mutationError) && (
          <p className="admin-error-banner" role="alert">
            {state.mutationError ?? error?.message}
          </p>
        )}

        {isPending ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }} role="status">
            Đang tải danh sách người dùng…
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data?.content.map((account) => (
                  <AdminUserRow
                    key={account.id}
                    user={account}
                    ownId={user?.id}
                    busy={state.pending !== null}
                    mutate={state.mutate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.content.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
            Không có người dùng phù hợp.
          </div>
        )}
      </div>

      <nav className="admin-pagination" aria-label="Phân trang người dùng">
        <button disabled={state.page === 0 || isFetching} onClick={() => state.setPage(state.page - 1)}>
          Trang trước
        </button>
        <span>
          Trang {state.page + 1} / {data?.totalPages || 1}
        </span>
        <button
          disabled={!data || state.page + 1 >= data.totalPages || isFetching}
          onClick={() => state.setPage(state.page + 1)}
        >
          Trang tiếp
        </button>
      </nav>
    </section>
  );
}
