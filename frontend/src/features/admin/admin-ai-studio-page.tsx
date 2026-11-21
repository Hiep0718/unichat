import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAiStudioMetrics, type AiStudioMetricsResponse } from './admin-api';
import { AiMeasurements } from './components/ai-measurements';
import { AiKeyChecks } from './components/ai-key-checks';
import { AiAdmissionControl } from './components/ai-admission-control';
import { getSessionSnapshot } from '../../lib/session-store';
import { SelectMenu } from '../../components/select-menu';
import type { SelectMenuOption } from '../../components/select-menu';
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

/**
 * Key filter choices: configured keys first, then up to 100 keys seen only in
 * history, each named when the configuration still knows it.
 */
function keyFilterOptions(data: AiStudioMetricsResponse | undefined): readonly SelectMenuOption<string>[] {
  const configured = data?.keys.map((key) => key.keyId) ?? [];
  const historical = data?.historicalKeys?.slice(0, 100).map((key) => key.keyId) ?? [];
  const ids = [...new Set([...configured, ...historical])];
  const named = ids.map((id) => ({ value: id, label: data?.keys.find((key) => key.keyId === id)?.name ?? id }));
  return [{ value: '', label: 'Tất cả API key' }, ...named];
}

/** Model filter choices: configured models and any model seen in the window. */
function modelFilterOptions(data: AiStudioMetricsResponse | undefined): readonly SelectMenuOption<string>[] {
  const names = [...new Set([...(data?.configuredModels ?? []), ...(data?.models ?? [])])];
  return [{ value: 'ALL', label: 'Tất cả mô hình' }, ...names.map((name) => ({ value: name, label: name }))];
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
              <SelectMenu variant="field" className="ai-studio-filter-select" label="API key"
                value={keyId} options={keyFilterOptions(data)} onChange={setKeyId} />
            </label>
            <label className="ai-studio-filter-label">
              Khoảng thời gian
              <SelectMenu variant="field" className="ai-studio-filter-select" label="Khoảng thời gian"
                value={days} options={[1, 7, 14, 28, 45].map((val) => ({ value: val, label: `${val} ngày` }))}
                onChange={setDays} />
            </label>
            <label className="ai-studio-filter-label">
              Mô hình
              <SelectMenu variant="field" className="ai-studio-filter-select" label="Mô hình"
                value={model} options={modelFilterOptions(data)} onChange={setModel} />
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
