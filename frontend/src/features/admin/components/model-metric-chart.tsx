import { useState } from 'react';
import type { ModelDataPoint } from '../admin-api';

interface Props {
  readonly data: readonly ModelDataPoint[];
  readonly models: readonly string[];
  readonly yFormatter?: (val: number) => string;
}

const MODEL_COLORS: Record<string, string> = {
  'gemini-2.5-flash': '#3b82f6',
  'gemini-3.5-flash': '#8b5cf6',
  'gemini-3.5-flash-lite': '#10b981',
  'gemini-3.8-flash': '#f97316',
};

function getSmoothSpline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (!first) return '';
  if (points.length === 1) return `M ${first.x} ${first.y}`;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = (i > 0 ? points[i - 1] : points[i]) ?? first;
    const p1 = points[i] ?? first;
    const p2 = points[i + 1] ?? p1;
    const p3 = (i < points.length - 2 ? points[i + 2] : p2) ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function ModelMetricChart({ data, models, yFormatter }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="ai-chart-empty-state">
        <span className="material-symbols-outlined">data_object</span>
        <p>Chưa có dữ liệu mô hình</p>
      </div>
    );
  }

  // Find max value across all models and days
  let rawMax = 0;
  data.forEach((row) => {
    models.forEach((m) => {
      const v = Number(row[m]) || 0;
      if (v > rawMax) rawMax = v;
    });
  });

  const hasData = rawMax > 0;
  const maxVal = hasData ? Math.max(10, Math.ceil(rawMax * 1.15)) : 10;

  const svgWidth = 640;
  const svgHeight = 200;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 28;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const count = data.length;
  const stepX = chartW / Math.max(1, count - 1);

  const defaultFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return `${v}`;
  };
  const formatY = yFormatter || defaultFormatter;

  const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : null;
  const hoveredX = hoveredIdx !== null ? padLeft + hoveredIdx * stepX : null;

  return (
    <div className="ai-chart-svg-wrap">
      {hoveredItem && hoveredX !== null && (
        <div
          className="ai-chart-floating-tooltip"
          style={{
            left: `${Math.min(85, Math.max(15, (hoveredX / svgWidth) * 100))}%`,
          }}
        >
          <div className="ai-chart-tooltip__header">{hoveredItem.date}</div>
          {models.map((m) => {
            const v = Number(hoveredItem[m]) || 0;
            const color = MODEL_COLORS[m] || '#64748b';
            return (
              <div key={m} className="ai-chart-tooltip__row">
                <span
                  className="ai-chart-tooltip__badge"
                  style={{ backgroundColor: color }}
                />
                <span>{m.replace('gemini-', '')}:</span>
                <strong>{formatY(v)}</strong>
              </div>
            );
          })}
        </div>
      )}

      {!hasData && (
        <div className="ai-chart-zero-indicator">
          <span>0 token phát sinh trong giai đoạn này</span>
        </div>
      )}

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          {models.map((m) => {
            const color = MODEL_COLORS[m] || '#64748b';
            return (
              <linearGradient key={m} id={`areaGrad-${m}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={color} stopOpacity="0.01" />
              </linearGradient>
            );
          })}
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padTop + pct * chartH;
          const val = Math.round(maxVal * (1 - pct));
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={svgWidth - padRight}
                y2={y}
                className="ai-chart-grid-line"
                strokeDasharray={pct === 1 ? 'none' : '3 3'}
                stroke={pct === 1 ? '#cbd5e1' : '#f1f5f9'}
              />
              <text x={padLeft - 8} y={y + 3.5} textAnchor="end" className="ai-chart-axis-text">
                {formatY(val)}
              </text>
            </g>
          );
        })}

        {/* Hover Guide Line */}
        {hoveredX !== null && (
          <line
            x1={hoveredX}
            y1={padTop}
            x2={hoveredX}
            y2={padTop + chartH}
            className="ai-chart-crosshair-line"
          />
        )}

        {/* Hit targets for hover */}
        {data.map((_, i) => (
          <rect
            key={i}
            x={padLeft + i * stepX - stepX / 2}
            y={padTop}
            width={stepX}
            height={chartH}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Multi-line series per model */}
        {hasData &&
          models.map((m) => {
            const color = MODEL_COLORS[m] || '#64748b';
            const points = data.map((d, i) => {
              const val = Number(d[m]) || 0;
              const x = padLeft + i * stepX;
              const y = padTop + (1 - val / maxVal) * chartH;
              return { x, y };
            });

            const spline = getSmoothSpline(points);
            const firstPt = points[0];
            const lastPt = points[points.length - 1];
            const areaSpline =
              firstPt && lastPt
                ? `${spline} L ${lastPt.x} ${padTop + chartH} L ${firstPt.x} ${padTop + chartH} Z`
                : '';
            const activePt = hoveredIdx !== null ? points[hoveredIdx] : null;

            return (
              <g key={m} style={{ pointerEvents: 'none' }}>
                {/* Translucent Area Gradient */}
                {areaSpline && <path d={areaSpline} fill={`url(#areaGrad-${m})`} />}
                {/* Main Stroke Spline */}
                <path
                  d={spline}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Active Hover Dot */}
                {activePt && (
                  <circle
                    cx={activePt.x}
                    cy={activePt.y}
                    r={4}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}

        {/* X Axis Date Labels */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(count / 5)) === 0).map((d) => {
          const origIdx = data.indexOf(d);
          const x = padLeft + origIdx * stepX;
          return (
            <text key={origIdx} x={x} y={svgHeight - 8} textAnchor="middle" className="ai-chart-axis-text">
              {d.date}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
