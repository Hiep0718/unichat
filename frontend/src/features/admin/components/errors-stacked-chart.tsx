import { useState } from 'react';
import type { ErrorsDataPoint } from '../admin-api';

interface Props {
  readonly data: readonly ErrorsDataPoint[];
}

export function ErrorsStackedChart({ data }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="ai-chart-empty-state">
        <span className="material-symbols-outlined">check_circle</span>
        <p>Chưa có dữ liệu lỗi</p>
      </div>
    );
  }

  const totalErrorsAcross = data.reduce((acc, d) => acc + d.totalErrors, 0);
  const rawMax = Math.max(...data.map((d) => d.totalErrors));
  const hasErrors = totalErrorsAcross > 0;
  const maxErrors = hasErrors ? Math.max(5, Math.ceil(rawMax * 1.2)) : 5;

  const svgWidth = 640;
  const svgHeight = 200;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 28;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const count = data.length;
  const stepX = chartW / Math.max(1, count - 1);
  const barWidth = Math.max(3, Math.min(8, (chartW / count) * 0.4));

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
            <span className="ai-chart-tooltip__badge" style={{ background: '#2563eb' }} />
            <span>429 (TooManyRequests):</span>
            <strong>{hoveredItem.error429}</strong>
          </div>
          <div className="ai-chart-tooltip__row">
            <span className="ai-chart-tooltip__badge" style={{ background: '#06b6d4' }} />
            <span>503 (ServiceUnavailable):</span>
            <strong>{hoveredItem.error503}</strong>
          </div>
          <div className="ai-chart-tooltip__row">
            <span>Tổng lỗi:</span>
            <strong>{hoveredItem.totalErrors}</strong>
          </div>
        </div>
      )}

      {!hasErrors && (
        <div className="ai-chart-zero-indicator">
          <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: 18 }}>check_circle</span>
          <span>Không phát sinh lỗi 429 / 503 trong khoảng thời gian này</span>
        </div>
      )}

      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padTop + pct * chartH;
          const errVal = Math.round(maxErrors * (1 - pct));
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
                {errVal}
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

        {/* Stacked Bars */}
        {data.map((d, i) => {
          const x = padLeft + i * stepX - barWidth / 2;
          const h429 = hasErrors ? (d.error429 / maxErrors) * chartH : 0;
          const h503 = hasErrors ? (d.error503 / maxErrors) * chartH : 0;

          const y429 = padTop + chartH - h429;
          const y503 = y429 - h503;

          return (
            <g key={i}>
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
              {h429 > 0 && (
                <rect
                  x={x}
                  y={y429}
                  width={barWidth}
                  height={Math.max(2, h429)}
                  rx={2}
                  fill="url(#amberGrad)"
                  style={{ pointerEvents: 'none' }}
                />
              )}
              {h503 > 0 && (
                <rect
                  x={x}
                  y={y503}
                  width={barWidth}
                  height={Math.max(2, h503)}
                  rx={2}
                  fill="url(#roseGrad)"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          );
        })}

        {/* X Axis Labels */}
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
