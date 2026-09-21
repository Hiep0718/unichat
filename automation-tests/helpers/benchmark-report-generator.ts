/**
 * HTML benchmark report generator.
 * Produces a standalone dashboard with radar charts, tables, and failed case analysis.
 */

import type { BenchmarkMetrics } from './benchmark-scorer.js';
import type { BenchmarkResult } from './chat-helper.js';

/**
 * Generate a standalone HTML benchmark report with inline CSS/JS.
 *
 * @param strictMetrics - Metrics from strict mode run (may be null)
 * @param hybridMetrics - Metrics from hybrid mode run (may be null)
 * @param results - All benchmark results (both modes)
 * @returns Complete HTML string
 */
export function generateBenchmarkReportHtml(
  strictMetrics: BenchmarkMetrics | null,
  hybridMetrics: BenchmarkMetrics | null,
  results: BenchmarkResult[],
): string {
  const metricsArray = [strictMetrics, hybridMetrics].filter(Boolean) as BenchmarkMetrics[];
  const failedCases = results.filter(
    (r) => r.status !== 'SUCCESS' || r.actualDecision !== r.expectedDecision,
  );

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UniChat RAG Benchmark Report</title>
  <style>
    :root {
      --bg: #0f172a; --surface: #1e293b; --surface-2: #334155;
      --text: #f1f5f9; --text-muted: #94a3b8; --accent: #38bdf8;
      --green: #22c55e; --red: #ef4444; --yellow: #eab308; --purple: #a855f7;
      --border: #475569; --radius: 12px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.6;
      padding: 2rem;
    }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 1rem; color: var(--accent); }
    h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .header { text-align: center; margin-bottom: 2rem; }
    .header p { color: var(--text-muted); font-size: 0.875rem; }
    .grid { display: grid; gap: 1rem; }
    .grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .grid-3 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 1.25rem;
    }
    .metric-card { text-align: center; }
    .metric-value {
      font-size: 2rem; font-weight: 700;
      background: linear-gradient(135deg, var(--accent), var(--purple));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .metric-value.good { background: linear-gradient(135deg, var(--green), #4ade80);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .metric-value.warn { background: linear-gradient(135deg, var(--yellow), #facc15);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .metric-value.bad { background: linear-gradient(135deg, var(--red), #f87171);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .metric-label { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { padding: 0.625rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { color: var(--accent); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
    tr:hover td { background: rgba(56, 189, 248, 0.05); }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 0.7rem; font-weight: 600;
    }
    .badge-success { background: rgba(34,197,94,0.15); color: var(--green); }
    .badge-error { background: rgba(239,68,68,0.15); color: var(--red); }
    .badge-warn { background: rgba(234,179,8,0.15); color: var(--yellow); }
    .badge-info { background: rgba(56,189,248,0.15); color: var(--accent); }
    .radar-container { display: flex; justify-content: center; padding: 1rem; }
    svg text { font-family: 'Inter', sans-serif; }
    .comparison-row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .comparison-col { flex: 1; min-width: 300px; }
    .failed-q { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; word-break: break-word; }
    .timestamp { font-size: 0.75rem; color: var(--text-muted); }
    @media (max-width: 768px) { body { padding: 1rem; } .grid-4 { grid-template-columns: 1fr 1fr; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 UniChat RAG Benchmark Report</h1>
    <p>Automated evaluation of 120 questions across 3 workspaces</p>
    <p class="timestamp">Generated: ${new Date().toLocaleString('vi-VN')}</p>
  </div>

  ${metricsArray.map((m) => renderModeSection(m, results)).join('<hr style="border-color:var(--border);margin:2rem 0;">')}

  ${metricsArray.length === 2 ? renderComparison(strictMetrics!, hybridMetrics!) : ''}

  <h2>❌ Các câu sai / lỗi (${failedCases.length} câu)</h2>
  <div class="card" style="overflow-x:auto;">
    <table>
      <thead>
        <tr><th>ID</th><th>Workspace</th><th>Câu hỏi</th><th>Expected</th><th>Actual</th><th>Status</th><th>Latency</th></tr>
      </thead>
      <tbody>
        ${failedCases.slice(0, 50).map((r) => `
          <tr>
            <td><code>${r.questionId}</code></td>
            <td>${r.workspace}</td>
            <td class="failed-q">${escHtml(r.question.slice(0, 80))}${r.question.length > 80 ? '...' : ''}</td>
            <td><span class="badge badge-info">${r.expectedDecision}</span></td>
            <td><span class="badge ${r.actualDecision === r.expectedDecision ? 'badge-success' : 'badge-error'}">${r.actualDecision}</span></td>
            <td><span class="badge ${r.status === 'SUCCESS' ? 'badge-warn' : 'badge-error'}">${r.status}</span></td>
            <td>${(r.latencyMs / 1000).toFixed(1)}s</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div style="text-align:center;margin-top:2rem;">
    <p class="timestamp">UniChat RAG Benchmark — Powered by Playwright E2E Automation</p>
  </div>
</body>
</html>`;
}

function renderModeSection(m: BenchmarkMetrics, results: BenchmarkResult[]): string {
  const modeLabel = m.ragMode === 'strict' ? '🔒 Strict (Chỉ theo Tài liệu)' : '🌐 Hybrid (RAG + AI Mở rộng)';
  const modeResults = results.filter((r) => r.ragMode === m.ragMode);

  return `
  <h2>${modeLabel}</h2>
  <div class="grid grid-4" style="margin-bottom:1.5rem;">
    ${metricCard(m.decisionAccuracy, 'Decision Accuracy')}
    ${metricCard(m.avgKeywordHitRate, 'Keyword Hit Rate')}
    ${metricCard(m.citationPresenceRate, 'Citation Presence')}
    ${metricCard(m.refusalF1, 'Refusal F1-Score')}
  </div>
  <div class="grid grid-4" style="margin-bottom:1.5rem;">
    <div class="card metric-card">
      <div class="metric-value">${m.successCount}/${m.totalQuestions}</div>
      <div class="metric-label">Thành công / Tổng</div>
    </div>
    <div class="card metric-card">
      <div class="metric-value">${(m.avgLatencyMs / 1000).toFixed(1)}s</div>
      <div class="metric-label">Avg Latency</div>
    </div>
    <div class="card metric-card">
      <div class="metric-value">${(m.latencyP50Ms / 1000).toFixed(1)}s</div>
      <div class="metric-label">p50 Latency</div>
    </div>
    <div class="card metric-card">
      <div class="metric-value">${(m.latencyP95Ms / 1000).toFixed(1)}s</div>
      <div class="metric-label">p95 Latency</div>
    </div>
  </div>

  <h3>📊 Per-Workspace</h3>
  <div class="card" style="overflow-x:auto;margin-bottom:1rem;">
    <table>
      <thead>
        <tr><th>Workspace</th><th>Total</th><th>Decision Acc</th><th>Keyword Hit</th><th>Citation</th><th>Avg Latency</th><th>p95 Latency</th></tr>
      </thead>
      <tbody>
        ${Object.values(m.perWorkspace).map((ws) => `
          <tr>
            <td>${ws.workspace}</td>
            <td>${ws.total}</td>
            <td>${pct(ws.decisionAccuracy)}</td>
            <td>${pct(ws.avgKeywordHitRate)}</td>
            <td>${pct(ws.citationPresenceRate)}</td>
            <td>${(ws.avgLatencyMs / 1000).toFixed(1)}s</td>
            <td>${(ws.latencyP95Ms / 1000).toFixed(1)}s</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <h3>🏷️ Per-Intent</h3>
  <div class="card" style="overflow-x:auto;">
    <table>
      <thead>
        <tr><th>Intent</th><th>Total</th><th>Decision Correct</th><th>Accuracy</th><th>Keyword Hit</th><th>Avg Latency</th></tr>
      </thead>
      <tbody>
        ${Object.values(m.perIntent).map((int) => `
          <tr>
            <td><span class="badge badge-info">${int.intent}</span></td>
            <td>${int.total}</td>
            <td>${int.decisionCorrect}/${int.total}</td>
            <td>${pct(int.decisionAccuracy)}</td>
            <td>${pct(int.avgKeywordHitRate)}</td>
            <td>${(int.avgLatencyMs / 1000).toFixed(1)}s</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

function renderComparison(strict: BenchmarkMetrics, hybrid: BenchmarkMetrics): string {
  const metrics = [
    ['Decision Accuracy', strict.decisionAccuracy, hybrid.decisionAccuracy],
    ['Keyword Hit Rate', strict.avgKeywordHitRate, hybrid.avgKeywordHitRate],
    ['Citation Presence', strict.citationPresenceRate, hybrid.citationPresenceRate],
    ['Refusal F1', strict.refusalF1, hybrid.refusalF1],
    ['Avg Latency (s)', strict.avgLatencyMs / 1000, hybrid.avgLatencyMs / 1000],
  ] as const;

  return `
  <h2>⚖️ So sánh Strict vs Hybrid</h2>
  <div class="card" style="overflow-x:auto;">
    <table>
      <thead>
        <tr><th>Metric</th><th>🔒 Strict</th><th>🌐 Hybrid</th><th>Delta</th></tr>
      </thead>
      <tbody>
        ${metrics.map(([name, s, h]) => {
          const delta = h - s;
          const isLatency = name.includes('Latency');
          const deltaStr = isLatency ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}s` : `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`;
          const cls = isLatency ? (delta > 0 ? 'badge-error' : 'badge-success') : (delta > 0 ? 'badge-success' : 'badge-error');
          return `<tr>
            <td>${name}</td>
            <td>${isLatency ? (s as number).toFixed(1) + 's' : pct(s as number)}</td>
            <td>${isLatency ? (h as number).toFixed(1) + 's' : pct(h as number)}</td>
            <td><span class="badge ${cls}">${deltaStr}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

function metricCard(value: number, label: string): string {
  const cls = value >= 0.8 ? 'good' : value >= 0.5 ? 'warn' : 'bad';
  return `<div class="card metric-card">
    <div class="metric-value ${cls}">${pct(value)}</div>
    <div class="metric-label">${label}</div>
  </div>`;
}

function pct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
