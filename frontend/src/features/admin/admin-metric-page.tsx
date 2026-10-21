import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../lib/api-client';
import { getSessionSnapshot } from '../../lib/session-store';
interface Metrics {
  status: string; completeness: string; sampleCount: number; updatedAt: string; retainedFrom: string | null;
  totalUsers: number; activeUsers: number; lockedUsers: number; adminUsers: number;
  loginSuccess: number; loginFailure: number; chatCompleted: number; chatFailed: number; chatCancelled: number;
  answerCount: number; refusalCount: number; clarifyCount: number;
  p95LatencyMs: number | null; ttftMs: number | null; latencySampleCount: number; ttftSampleCount: number;
}

/** Displays auth and logical chat measurements without workspace/post counters. */
export function AdminMetricPage() {
  const [days, setDays] = useState(28);
  const { data, error, isPending } = useQuery({ retry: false,
    queryKey: ['admin-system-metrics', getSessionSnapshot().generation, days],
    queryFn: () => fetchJson<Metrics>(`/admin/metrics?days=${days}`) });
  return <section className="admin-page"><header className="admin-page__header"><h2>Metrics đăng nhập và chat AI</h2>
    <p>Tổng hợp hoạt động tài khoản và chất lượng xử lý hội thoại.</p></header>
    <div className="admin-page__toolbar"><label>Khoảng thời gian <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
      {[1, 7, 28, 45].map((value) => <option key={value} value={value}>{value} ngày</option>)}</select></label>
    </div>
    {isPending && <p className="admin-page__notice" role="status">Đang tải số liệu…</p>}{error && <p className="admin-page__error" role="alert">{error.message}</p>}
    {data && <><p className="admin-page__meta">{data.status} · {data.sampleCount} mẫu · {data.completeness} · Cập nhật {data.updatedAt}</p>
      <div className="admin-page__card"><dl><dt>Người dùng / ACTIVE / khóa / ADMIN</dt><dd>{data.totalUsers} / {data.activeUsers} / {data.lockedUsers} / {data.adminUsers}</dd>
        <dt>Đăng nhập thành công / thất bại</dt><dd>{data.loginSuccess} / {data.loginFailure}</dd>
        <dt>Chat hoàn tất / thất bại / hủy</dt><dd>{data.chatCompleted} / {data.chatFailed} / {data.chatCancelled}</dd>
        <dt>ANSWER / CLARIFY / REFUSE</dt><dd>{data.answerCount} / {data.clarifyCount} / {data.refusalCount}</dd>
        <dt>Độ trễ p95</dt><dd>{data.p95LatencyMs ?? '—'} ms ({data.latencySampleCount} mẫu)</dd>
        <dt>TTFT trung bình</dt><dd>{data.ttftMs ?? '—'} ms ({data.ttftSampleCount} mẫu)</dd></dl></div>
      <p>Dữ liệu giữ từ: {data.retainedFrom ?? '—'}</p></>}
  </section>;
}
export default AdminMetricPage;
