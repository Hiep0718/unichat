import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAiStudioMetrics } from './admin-api';
import { AiMeasurements } from './components/ai-measurements';
import { AiKeyChecks } from './components/ai-key-checks';
import { getSessionSnapshot } from '../../lib/session-store';
import './admin-ai-studio-page.css';

/** Displays durable Core measurements and stable key-bound provider checks. */
export function AdminAiStudioPage() {
  const [days, setDays] = useState(28);
  const [keyId, setKeyId] = useState('');
  const [model, setModel] = useState('ALL');
  const { data, error, isPending, isFetching, refetch } = useQuery({ retry: false,
    queryKey: ['admin-ai-metrics', getSessionSnapshot().generation, days, keyId, model],
    queryFn: () => fetchAiStudioMetrics(days, keyId || undefined, model) });
  return <div className="ai-studio-page"><header><h2>Gemini API Usage</h2>
    <p>{data?.tier || 'Chưa có thông tin gói dịch vụ'}</p>
    <label>API key <select value={keyId} onChange={(event) => setKeyId(event.target.value)}><option value="">Tất cả API key</option>
      {data?.keys.map((key) => <option key={key.keyId} value={key.keyId}>{key.name}</option>)}</select></label>
    <label>Khoảng thời gian <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
      {[1, 7, 14, 28, 45].map((value) => <option key={value} value={value}>{value} ngày</option>)}</select></label>
    <label>Mô hình <select value={model} onChange={(event) => setModel(event.target.value)}><option value="ALL">Tất cả mô hình</option>
      {[...new Set([...(data?.configuredModels ?? []), ...(data?.models ?? [])])].map((name) => <option key={name}>{name}</option>)}</select></label>
    <button disabled={isFetching} onClick={() => void refetch()}>Tải lại</button></header>
    {isPending && <p role="status">Đang tải số liệu…</p>}{error && <p role="alert">{error.message}</p>}
    {data && <><p>{data.status === 'NO_DATA' ? 'Chưa có mẫu đo trong khoảng thời gian này.' : `${data.sampleCount} mẫu đo`}</p>
      <p>Độ đầy đủ: {data.completeness} · Cập nhật: {data.updatedAt} · Registry: {data.registryStatus}</p>
      <p>Thu thập từ: {data.retainedFrom ?? '—'} · Tỷ lệ thành công: {data.summary.overallSuccessRate ?? '—'}%</p>
      <AiMeasurements metrics={data} /><AiKeyChecks keys={data.keys} selectedKey={keyId} model={model === 'ALL' ? data.configuredModels[0] ?? '' : model} /></>}
  </div>;
}
export default AdminAiStudioPage;
