import { useId, useState } from 'react';
import { modelMeasurementPath } from './model-measurement-path';
import type { ModelDataPoint } from '../admin-api';

interface Props {
  readonly data: readonly ModelDataPoint[];
  readonly models: readonly string[];
  readonly yFormatter?: (value: number) => string;
}
const COLORS = ['#0369a1', '#047857', '#b45309', '#be123c', '#64748b'];

function defaultFormatter(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

/** Plots any configured or historical model, including slash names, with unknown gaps. */
export function ModelMetricChart({ data, models, yFormatter = defaultFormatter }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartIdentity = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const measurements = data.flatMap((row) => models.map((name) => row[name]))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const maximum = Math.max(10, ...measurements) * 1.15;
  const step = 575 / Math.max(1, data.length - 1);
  const hovered = hoveredIndex === null ? undefined : data[hoveredIndex];
  if (!data.length) return <div className="ai-chart-empty-state"><p>Chưa có dữ liệu mô hình</p></div>;
  return <div className="ai-chart-svg-wrap">
    {hovered && <div className="ai-chart-floating-tooltip"><div className="ai-chart-tooltip__header">{hovered.date}</div>
      {models.map((model, index) => <div key={model} className="ai-chart-tooltip__row">
        <span className="ai-chart-tooltip__badge" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
        <span>{model}:</span><strong>{typeof hovered[model] === 'number' ? yFormatter(hovered[model]) : '—'}</strong></div>)}</div>}
    {!measurements.length && <p>Chưa có số đo.</p>}
    <svg viewBox="0 0 640 200" role="img" aria-label="Số đo theo mô hình">
      <defs>{models.map((model, index) => <linearGradient key={model} id={`${chartIdentity}-series-${index}`}>
        <stop stopColor={COLORS[index % COLORS.length]} /></linearGradient>)}</defs>
      {[0, 0.25, 0.5, 0.75, 1].map((fraction) => <g key={fraction}>
        <line x1={45} y1={20 + fraction * 152} x2={620} y2={20 + fraction * 152} stroke="#e2e8f0" />
        <text x={37} y={24 + fraction * 152} textAnchor="end" className="ai-chart-axis-text">{yFormatter(Math.round(maximum * (1 - fraction)))}</text></g>)}
      {models.map((model, index) => <path key={model} d={modelMeasurementPath(data, model, maximum)}
        fill="none" stroke={`url(#${chartIdentity}-series-${index})`} strokeWidth={2}><title>{model}</title></path>)}
      {data.map((row, index) => <rect key={`${row.date}-${index}`} x={45 + index * step - step / 2} y={20}
        width={step} height={152} fill="transparent" onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} />)}
      {data.map((row, index) => index % Math.max(1, Math.floor(data.length / 5)) === 0
        ? <text key={`${row.date}-${index}`} x={45 + index * step} y={192} textAnchor="middle" className="ai-chart-axis-text">{row.date}</text> : null)}
    </svg></div>;
}
