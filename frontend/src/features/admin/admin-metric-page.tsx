import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../lib/api-client';
import { getSessionSnapshot } from '../../lib/session-store';

interface Metrics {
  readonly status: string;
  readonly completeness: string;
  readonly sampleCount: number;
  readonly updatedAt: string;
  readonly retainedFrom: string | null;
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly lockedUsers: number;
  readonly adminUsers: number;
  readonly loginSuccess: number;
  readonly loginFailure: number;
  readonly chatCompleted: number;
  readonly chatFailed: number;
  readonly chatCancelled: number;
  readonly answerCount: number;
  readonly refusalCount: number;
  readonly clarifyCount: number;
  readonly p95LatencyMs: number | null;
  readonly ttftMs: number | null;
  readonly latencySampleCount: number;
  readonly ttftSampleCount: number;
}

/** Displays auth and logical chat measurements without workspace/post counters. */
export function AdminMetricPage() {
  const [days, setDays] = useState(28);
  const { data, error, isPending } = useQuery({
    retry: false,
    queryKey: ['admin-system-metrics', getSessionSnapshot().generation, days],
    queryFn: () => fetchJson<Metrics>(`/admin/metrics?days=${days}`),
  });

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h2>Metrics đăng nhập và chat AI</h2>
        <p>Tổng hợp hoạt động tài khoản và chất lượng xử lý hội thoại.</p>
      </header>

      <div className="admin-page__toolbar">
        <label>
          Khoảng thời gian
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            {[1, 7, 28, 45].map((value) => (
              <option key={value} value={value}>
                {value} ngày
              </option>
            ))}
          </select>
        </label>
      </div>

      {isPending && <p className="admin-page__notice" role="status">Đang tải số liệu…</p>}
      {error && <p className="admin-page__error" role="alert">{error.message}</p>}

      {data && (
        <>
          <div className="admin-page__meta-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563eb' }}>info</span>
            <p className="admin-page__meta" style={{ margin: 0 }}>
              {data.status} · {data.sampleCount} mẫu · {data.completeness} · Cập nhật {data.updatedAt}
            </p>
          </div>

          <div className="admin-metrics-kpi-grid">
            <div className="admin-metrics-kpi-card">
              <span className="admin-metrics-kpi-label">Người dùng hệ thống</span>
              <span className="admin-metrics-kpi-value admin-metrics-kpi-value--blue">{data.totalUsers}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {data.activeUsers} hoạt động · {data.lockedUsers} bị khóa · {data.adminUsers} admin
              </span>
            </div>

            <div className="admin-metrics-kpi-card">
              <span className="admin-metrics-kpi-label">Xác thực đăng nhập</span>
              <span className="admin-metrics-kpi-value admin-metrics-kpi-value--green">{data.loginSuccess}</span>
              <span style={{ fontSize: '0.8rem', color: '#dc2626' }}>
                {data.loginFailure} lượt thất bại
              </span>
            </div>

            <div className="admin-metrics-kpi-card">
              <span className="admin-metrics-kpi-label">Hội thoại AI hoàn tất</span>
              <span className="admin-metrics-kpi-value admin-metrics-kpi-value--green">{data.chatCompleted}</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                {data.chatFailed} lỗi · {data.chatCancelled} bị hủy
              </span>
            </div>

            <div className="admin-metrics-kpi-card">
              <span className="admin-metrics-kpi-label">Hiệu năng TTFT / p95</span>
              <span className="admin-metrics-kpi-value admin-metrics-kpi-value--amber">
                {data.ttftMs ?? '—'} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>ms</span>
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Độ trễ p95: {data.p95LatencyMs ?? '—'} ms ({data.latencySampleCount} mẫu)
              </span>
            </div>
          </div>

          <div className="admin-page__card">
            <h3>Chi tiết đo lường hệ thống</h3>
            <dl>
              <dt>Người dùng / ACTIVE / khóa / ADMIN</dt>
              <dd>
                {data.totalUsers} / {data.activeUsers} / {data.lockedUsers} / {data.adminUsers}
              </dd>
              <dt>Đăng nhập thành công / thất bại</dt>
              <dd>
                {data.loginSuccess} / {data.loginFailure}
              </dd>
              <dt>Chat hoàn tất / thất bại / hủy</dt>
              <dd>
                {data.chatCompleted} / {data.chatFailed} / {data.chatCancelled}
              </dd>
              <dt>ANSWER / CLARIFY / REFUSE</dt>
              <dd>
                {data.answerCount} / {data.clarifyCount} / {data.refusalCount}
              </dd>
              <dt>Độ trễ p95</dt>
              <dd>
                {data.p95LatencyMs ?? '—'} ms ({data.latencySampleCount} mẫu)
              </dd>
              <dt>TTFT trung bình</dt>
              <dd>
                {data.ttftMs ?? '—'} ms ({data.ttftSampleCount} mẫu)
              </dd>
            </dl>
          </div>
          <p className="admin-page__meta">Dữ liệu giữ từ: {data.retainedFrom ?? '—'}</p>
        </>
      )}
    </section>
  );
}

export default AdminMetricPage;
