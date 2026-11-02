import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAiStudioMetrics, type AiStudioMetricsResponse } from './admin-api';
import { AiMeasurements } from './components/ai-measurements';
import { AiKeyChecks } from './components/ai-key-checks';
import { AiAdmissionControl } from './components/ai-admission-control';
import { getSessionSnapshot } from '../../lib/session-store';
import './admin-ai-studio-page.css';

interface SummaryProps {
  readonly data: AiStudioMetricsResponse;
}

function StudioSummary({ data }: SummaryProps) {
  const successText = data.summary.overallSuccessRate != null ? `${data.summary.overallSuccessRate}%` : '—';
  return (
    <div className="ai-studio-summary-card">
      <div className="ai-studio-kpi-grid">
        <div className="ai-kpi-card">
          <div className="ai-kpi-card__icon ai-kpi-card__icon--blue">
            <span className="material-symbols-outlined">analytics</span>
          </div>
          <div className="ai-kpi-card__info">
            <span className="ai-kpi-card__label">Mẫu đo thu thập</span>
            <span className="ai-kpi-card__value">
              {data.status === 'NO_DATA' ? 'Chưa có mẫu đo trong khoảng thời gian này.' : `${data.sampleCount} mẫu đo`}
            </span>
          </div>
        </div>
        <div className="ai-kpi-card">
          <div className="ai-kpi-card__icon ai-kpi-card__icon--green">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="ai-kpi-card__info">
            <span className="ai-kpi-card__label">Tỷ lệ thành công</span>
            <span className="ai-kpi-card__value">{successText}</span>
          </div>
        </div>
        <div className="ai-kpi-card">
          <div className="ai-kpi-card__icon ai-kpi-card__icon--amber">
            <span className="material-symbols-outlined">dataset</span>
          </div>
          <div className="ai-kpi-card__info">
            <span className="ai-kpi-card__label">Trạng thái dữ liệu</span>
            <span className="ai-kpi-card__value" style={{ fontSize: '1.05rem' }}>
              {data.registryStatus} · {data.status}
            </span>
          </div>
        </div>
      </div>
      <div className="ai-studio-meta-banner">
        <p className="ai-studio-meta-line">
          Độ đầy đủ: {data.completeness} · Cập nhật: {data.updatedAt} · Registry: {data.registryStatus}
        </p>
        <p className="ai-studio-meta-line">
          Thu thập từ: {data.retainedFrom ?? '—'} · Tỷ lệ thành công: {data.summary.overallSuccessRate ?? '—'}%
        </p>
        <p className="ai-studio-routing-banner">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>alt_route</span>
          <span>
            Luồng sinh nội dung: {data.primaryProvider ?? data.activeProvider ?? 'chưa rõ'} · Mô hình: {data.activeModel ?? 'chưa rõ'}
            {' → dự phòng: '}{data.fallbackProvider ?? 'không cấu hình'}{data.fallbackModel ? ` · ${data.fallbackModel}` : ''}
          </span>
        </p>
      </div>
    </div>
  );
}

/** Displays durable Core measurements and stable key-bound provider checks. */
export function AdminAiStudioPage() {
  const [days, setDays] = useState(28);
  const [keyId, setKeyId] = useState('');
  const [model, setModel] = useState('ALL');
  const { data, error, isPending, isFetching, refetch } = useQuery({
    retry: false,
    placeholderData: keepPreviousData,
    queryKey: ['admin-ai-metrics', getSessionSnapshot().generation, days, keyId, model],
    queryFn: () => fetchAiStudioMetrics(days, keyId || undefined, model),
  });

  return (
    <div className="ai-studio-page">
      <header className="ai-studio-toolbar">
        <div className="ai-studio-toolbar__header">
          <div className="ai-studio-toolbar__title-wrap">
            <h2 className="ai-studio-toolbar__title">Giám sát nhà cung cấp AI</h2>
            <span className="ai-studio-tier-badge">{data?.tier || 'Chưa có thông tin gói dịch vụ'}</span>
          </div>
          <div className="ai-studio-toolbar__filters">
            <label className="ai-studio-filter-label">
              API key
              <select className="ai-studio-filter-select" value={keyId} onChange={(e) => setKeyId(e.target.value)}>
                <option value="">Tất cả API key</option>
                {[...new Set([...(data?.keys.map((k) => k.keyId) ?? []), ...(data?.historicalKeys?.slice(0, 100).map((k) => k.keyId) ?? [])])]
                  .map((id) => <option key={id} value={id}>{data?.keys.find((k) => k.keyId === id)?.name ?? id}</option>)}
              </select>
            </label>
            <label className="ai-studio-filter-label">
              Khoảng thời gian
              <select className="ai-studio-filter-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {[1, 7, 14, 28, 45].map((val) => <option key={val} value={val}>{val} ngày</option>)}
              </select>
            </label>
            <label className="ai-studio-filter-label">
              Mô hình
              <select className="ai-studio-filter-select" value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="ALL">Tất cả mô hình</option>
                {[...new Set([...(data?.configuredModels ?? []), ...(data?.models ?? [])])].map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <button className="ai-studio-btn-refresh" disabled={isFetching} onClick={() => void refetch()}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
              <span>Tải lại</span>
            </button>
          </div>
        </div>
      </header>
      {isPending && <p className="admin-page__notice" role="status">Đang tải số liệu…</p>}
      {error && <p className="admin-page__error" role="alert">{error.message}</p>}
      <AiAdmissionControl />
      {data && (
        <>
          <StudioSummary data={data} />
          <AiMeasurements metrics={data} />
          <AiKeyChecks keys={data.keys} configuredModels={data.configuredModels} activeProvider={data.activeProvider ?? null} />
        </>
      )}
    </div>
  );
}

export default AdminAiStudioPage;
