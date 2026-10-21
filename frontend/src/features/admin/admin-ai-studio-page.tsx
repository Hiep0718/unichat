import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAiStudioMetrics } from './admin-api';
import { AiMeasurements } from './components/ai-measurements';
import { AiKeyChecks } from './components/ai-key-checks';
import { AiAdmissionControl } from './components/ai-admission-control';
import { getSessionSnapshot } from '../../lib/session-store';
import './admin-ai-studio-page.css';

/** Displays durable Core measurements and stable key-bound provider checks. */
export function AdminAiStudioPage() {
  const [days, setDays] = useState(28);
  const [keyId, setKeyId] = useState('');
  const [model, setModel] = useState('ALL');
  const { data, error, isPending, isFetching, refetch } = useQuery({ retry: false, placeholderData: keepPreviousData,
    queryKey: ['admin-ai-metrics', getSessionSnapshot().generation, days, keyId, model],
    queryFn: () => fetchAiStudioMetrics(days, keyId || undefined, model) });
  return <div className="ai-studio-page"><header className="ai-studio-toolbar"><div className="ai-studio-toolbar__header"><div className="ai-studio-toolbar__title-wrap">
    <h2 className="ai-studio-toolbar__title">Giám sát nhà cung cấp AI</h2><span className="ai-studio-tier-badge">{data?.tier || 'Chưa có thông tin gói dịch vụ'}</span></div>
    <div className="ai-studio-toolbar__filters"><label>API key <select className="ai-studio-filter-select" value={keyId} onChange={(event) => setKeyId(event.target.value)}><option value="">Tất cả API key</option>
      {[...new Set([...(data?.keys.map((key) => key.keyId) ?? []), ...(data?.historicalKeys?.slice(0, 100).map((key) => key.keyId) ?? [])])]
        .map((identity) => <option key={identity} value={identity}>{data?.keys.find((key) => key.keyId === identity)?.name ?? identity}</option>)}</select></label>
    <label>Khoảng thời gian <select className="ai-studio-filter-select" value={days} onChange={(event) => setDays(Number(event.target.value))}>
      {[1, 7, 14, 28, 45].map((value) => <option key={value} value={value}>{value} ngày</option>)}</select></label>
    <label>Mô hình <select className="ai-studio-filter-select" value={model} onChange={(event) => setModel(event.target.value)}><option value="ALL">Tất cả mô hình</option>
      {[...new Set([...(data?.configuredModels ?? []), ...(data?.models ?? [])])].map((name) => <option key={name}>{name}</option>)}</select></label>
    <button className="ai-studio-btn-refresh" disabled={isFetching} onClick={() => void refetch()}>Tải lại</button></div></div></header>
    {isPending && <p className="admin-page__notice" role="status">Đang tải số liệu…</p>}{error && <p className="admin-page__error" role="alert">{error.message}</p>}
    <AiAdmissionControl />{data && <><p>{data.status === 'NO_DATA' ? 'Chưa có mẫu đo trong khoảng thời gian này.' : `${data.sampleCount} mẫu đo`}</p>
      <p>Độ đầy đủ: {data.completeness} · Cập nhật: {data.updatedAt} · Registry: {data.registryStatus}</p>
      <p>Thu thập từ: {data.retainedFrom ?? '—'} · Tỷ lệ thành công: {data.summary.overallSuccessRate ?? '—'}%</p>
      <p>Nhà cung cấp đang hoạt động: {data.activeProvider ?? 'chưa rõ'} · Mô hình: {data.activeModel ?? 'chưa rõ'}</p>
      <AiMeasurements metrics={data} /><AiKeyChecks keys={data.keys} configuredModels={data.configuredModels} activeProvider={data.activeProvider ?? null} /></>}
  </div>;
}
export default AdminAiStudioPage;
