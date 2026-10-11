import { useState } from 'react';
import type { RequestsSuccessDataPoint } from '../admin-api';

interface Props {
  readonly data: readonly RequestsSuccessDataPoint[];
}

/**
 * Computes a smooth cubic Bézier spline SVG path from an array of coordinates.
 */
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

export function RequestsSuccessChart({ data }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="ai-chart-empty-state">
        <span className="material-symbols-outlined">query_stats</span>
        <p>Chưa có dữ liệu cuộc gọi API trong khoảng thời gian này</p>
      </div>
    );
  }

  const rawMax = Math.max(...data.map((d) => d.requests));
  const hasData = rawMax > 0;
  const maxRequests = hasData ? Math.max(5, Math.ceil(rawMax * 1.15)) : 10;

  const svgWidth = 640;
  const svgHeight = 200;
  const padLeft = 40;
  const padRight = 44;
  const padTop = 20;
  const padBottom = 28;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const count = data.length;
  const stepX = chartW / Math.max(1, count - 1);
  const barWidth = Math.max(3, Math.min(8, (chartW / count) * 0.4));

  // Compute points for success rate line
  const ratePoints = data.flatMap((d, i) => {
    if (d.successRate === null) return [];
    const x = padLeft + i * stepX;
    const effectiveRate = d.successRate;
    const y = padTop + (1 - effectiveRate / 100) * chartH;
    return [{ x, y }];
  });

  const splinePath = getSmoothSpline(ratePoints);
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
          <div className="ai-chart-tooltip__row">
            <span className="ai-chart-tooltip__badge ai-chart-tooltip__badge--blue" />
            <span>Yêu cầu:</span>
            <strong>{hoveredItem.requests.toLocaleString()}</strong>
          </div>
          <div className="ai-chart-tooltip__row">
            <span className="ai-chart-tooltip__badge ai-chart-tooltip__badge--green" />
            <span>Tỷ lệ thành công:</span>
            <strong>{hoveredItem.requests > 0 ? `${hoveredItem.successRate}%` : 'N/A (0 request)'}</strong>
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="reqBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a73e8" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#4285f4" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="reqBarHoverGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1557b0" stopOpacity="1" />
            <stop offset="100%" stopColor="#1a73e8" stopOpacity="0.95" />
          </linearGradient>
          <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#10b981" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padTop + pct * chartH;
          const reqVal = Math.round(maxRequests * (1 - pct));
          const rateVal = Math.round(100 * (1 - pct));
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
                {reqVal}
              </text>
              <text x={svgWidth - padRight + 8} y={y + 3.5} textAnchor="start" className="ai-chart-axis-text">
                {rateVal}%
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

        {/* Slim Refined Bars */}
        {data.map((d, i) => {
          const isHovered = hoveredIdx === i;
          const barH = hasData ? (d.requests / maxRequests) * chartH : 0;
          const x = padLeft + i * stepX - barWidth / 2;
          const y = padTop + chartH - barH;

          return (
            <g key={i}>
              {/* Invisible wider hover hit target */}
              <rect
                x={padLeft + i * stepX - stepX / 2}
                y={padTop}
                width={stepX}
                height={chartH}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
              {barH > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(2, barH)}
                  rx={2}
                  fill={isHovered ? 'url(#reqBarHoverGradient)' : 'url(#reqBarGradient)'}
                  style={{
                    transition: 'all 0.15s ease',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </g>
          );
        })}

        {/* Smooth Cubic Spline Line for Success Rate */}
        {hasData && (
          <path
            d={splinePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#emeraldGlow)"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Single interactive pin dot on hovered item */}
        {hoveredIdx !== null && hasData && ratePoints[hoveredIdx] && (
          <circle
            cx={ratePoints[hoveredIdx]?.x}
            cy={ratePoints[hoveredIdx]?.y}
            r={4.5}
            fill="#10b981"
            stroke="#ffffff"
            strokeWidth={2}
            style={{ pointerEvents: 'none' }}
          />
        )}

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
