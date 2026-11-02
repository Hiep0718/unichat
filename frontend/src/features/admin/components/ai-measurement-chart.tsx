import { useMemo, useState } from 'react';
import type { ModelDataPoint } from '../admin-api';

interface Props {
  readonly title: string;
  readonly data: readonly ModelDataPoint[];
  readonly series: readonly string[];
}

const SERIES_COLORS: Record<string, string> = {
  requests: '#2563eb',
  error429: '#f59e0b',
  error503: '#0284c7',
  errorOther: '#ef4444',
};

const PALETTE = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

function getSeriesColor(name: string, index: number): string {
  return SERIES_COLORS[name] ?? PALETTE[index % PALETTE.length] ?? '#2563eb';
}

const SERIES_LABELS: Record<string, string> = {
  requests: 'Thành công',
  error429: 'Lỗi 429 (Rate Limit)',
  error503: 'Lỗi 503 (Dịch vụ bận)',
  errorOther: 'Lỗi khác',
};

function getSeriesLabel(name: string): string {
  const mapped = SERIES_LABELS[name];
  if (mapped) return mapped;
  if (name.includes('/')) return name.split('/').pop() ?? name;
  return name;
}

function computeNiceMax(rawMax: number): number {
  if (rawMax <= 0) return 5;
  if (rawMax <= 5) return 5;
  if (rawMax <= 10) return 10;
  if (rawMax <= 20) return 20;
  if (rawMax <= 50) return 50;
  if (rawMax <= 100) return 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function formatAxisVal(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${val}`;
}

function formatDateTick(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[1] && parts[2]) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

function getTickIndices(total: number): Set<number> {
  if (total <= 6) return new Set(Array.from({ length: total }, (_, i) => i));
  const step = Math.ceil(total / 6);
  const indices = new Set<number>();
  for (let i = 0; i < total; i += step) {
    indices.add(i);
  }
  const last = total - 1;
  const prev = Math.floor(last / step) * step;
  if (last - prev >= Math.floor(step / 2)) {
    indices.add(last);
  }
  return indices;
}

const SVG_WIDTH = 640;
const SVG_HEIGHT = 180;
const PAD_LEFT = 46;
const PAD_RIGHT = 14;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;
const CHART_W = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const CHART_H = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

/** High-legibility SVG measurement chart with reference grid, date axis and hover tooltips. */
export function AiMeasurementChart({ title, data, series }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const measured = useMemo(
    () =>
      data.flatMap((row) =>
        series.map((name) => row[name]).filter((val): val is number => typeof val === 'number')
      ),
    [data, series]
  );

  const hasMeasurements = measured.length > 0;
  const rawMax = Math.max(0, ...measured);
  const niceMax = computeNiceMax(rawMax);
  const totalSum = measured.reduce((sum, v) => sum + v, 0);

  const groupWidth = CHART_W / Math.max(1, data.length);
  const tickIndices = useMemo(() => getTickIndices(data.length), [data.length]);

  const maxBarW = series.length === 1 ? 16 : 9;
  const barW = Math.max(2, Math.min(maxBarW, (groupWidth * 0.75) / Math.max(1, series.length)));
  const innerOffset = (groupWidth - barW * series.length) / 2;

  const hoveredRow = hoveredIdx !== null ? data[hoveredIdx] : null;
  const hoveredCenterX = hoveredIdx !== null ? PAD_LEFT + hoveredIdx * groupWidth + groupWidth / 2 : 0;
  const tooltipLeftPct = Math.min(84, Math.max(16, (hoveredCenterX / SVG_WIDTH) * 100));

  return (
    <section className="ai-chart-card">
      <div className="ai-chart-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className="ai-chart-card__title">{title}</h3>
          {totalSum > 0 && (
            <span className="ai-chart-header-badge" title="Tổng số đo trong kỳ">
              {formatAxisVal(totalSum)}
            </span>
          )}
        </div>
        <div className="ai-chart-card__legend">
          {series.map((name, sIdx) => (
            <span key={name} className="ai-chart-card__legend-item" title={name}>
              <span className="ai-chart-card__legend-dot" style={{ backgroundColor: getSeriesColor(name, sIdx) }} />
              <span>{getSeriesLabel(name)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="ai-chart-svg-wrap">
        {hoveredRow && (
          <div className="ai-chart-floating-tooltip" style={{ left: `${tooltipLeftPct}%` }}>
            <div className="ai-chart-tooltip__header">{hoveredRow.date}</div>
            {series.map((name, sIdx) => {
              const val = hoveredRow[name];
              return (
                <div key={name} className="ai-chart-tooltip__row">
                  <span className="ai-chart-tooltip__badge" style={{ backgroundColor: getSeriesColor(name, sIdx) }} />
                  <span>{getSeriesLabel(name)}:</span>
                  <strong>{typeof val === 'number' ? val.toLocaleString() : '—'}</strong>
                </div>
              );
            })}
          </div>
        )}

        {!hasMeasurements && (
          <div className="ai-chart-empty-overlay">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#94a3b8' }}>
              bar_chart
            </span>
            <p style={{ margin: 0 }}>Chưa có số đo.</p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-label={title}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Reference Grid & Y-Axis */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const y = PAD_TOP + frac * CHART_H;
            const val = Math.round(niceMax * (1 - frac));
            const isBaseline = frac === 1.0;
            return (
              <g key={idx}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={SVG_WIDTH - PAD_RIGHT}
                  y2={y}
                  stroke={isBaseline ? '#cbd5e1' : '#f1f5f9'}
                  strokeDasharray={isBaseline ? 'none' : '3 3'}
                  strokeWidth={isBaseline ? 1.5 : 1}
                />
                <text x={PAD_LEFT - 8} y={y + 3.5} textAnchor="end" className="ai-chart-axis-text">
                  {formatAxisVal(val)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Date Ticks */}
          {data.map((row, idx) => {
            if (!tickIndices.has(idx)) return null;
            const tickX = PAD_LEFT + idx * groupWidth + groupWidth / 2;
            const baselineY = PAD_TOP + CHART_H;
            return (
              <g key={`tick-${row.date}`}>
                <line x1={tickX} y1={baselineY} x2={tickX} y2={baselineY + 4} stroke="#cbd5e1" />
                <text x={tickX} y={baselineY + 16} textAnchor="middle" className="ai-chart-axis-text">
                  {formatDateTick(row.date)}
                </text>
              </g>
            );
          })}

          {/* Hover Column Background */}
          {hoveredIdx !== null && (
            <rect
              x={PAD_LEFT + hoveredIdx * groupWidth}
              y={PAD_TOP}
              width={groupWidth}
              height={CHART_H}
              fill="#3b82f6"
              fillOpacity={0.07}
              rx={3}
            />
          )}

          {/* Measurement Bars */}
          {data.flatMap((row, dayIdx) =>
            series.map((name, sIdx) => {
              const val = row[name];
              if (typeof val !== 'number') return null;
              const isZero = val === 0;
              const barH = isZero ? 1.5 : Math.max(3, (val / niceMax) * CHART_H);
              const barY = PAD_TOP + CHART_H - barH;
              const barX = PAD_LEFT + dayIdx * groupWidth + innerOffset + sIdx * barW;
              return (
                <rect
                  key={`${row.date}-${name}`}
                  x={barX}
                  y={barY}
                  width={Math.max(2, barW - 1)}
                  height={barH}
                  fill={isZero ? '#94a3b8' : getSeriesColor(name, sIdx)}
                  rx={isZero ? 0 : 2}
                >
                  <title>{`${row.date}: ${getSeriesLabel(name)} ${val}`}</title>
                </rect>
              );
            })
          )}

          {/* Transparent Hover Hit Areas */}
          {data.map((row, dayIdx) => (
            <rect
              key={`zone-${row.date}`}
              x={PAD_LEFT + dayIdx * groupWidth}
              y={PAD_TOP}
              width={groupWidth}
              height={CHART_H}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(dayIdx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>
      </div>

      <details className="ai-chart-details">
        <summary className="ai-chart-summary">Xem số liệu chi tiết</summary>
        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table className="ai-chart-table">
            <thead>
              <tr>
                <th>Ngày</th>
                {series.map((name) => (
                  <th key={name}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  {series.map((name) => (
                    <td key={name}>{row[name] ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
