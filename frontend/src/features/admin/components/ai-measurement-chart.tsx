import type { ModelDataPoint } from '../admin-api';
const COLORS = ['#0369a1', '#047857', '#b45309', '#be123c'];
interface Props { title: string; data: ModelDataPoint[]; series: string[] }

/** Plots measured values only; absent measurements remain gaps and accessible dashes. */
export function AiMeasurementChart({ title, data, series }: Props) {
  const measured = data.flatMap((row) => series.map((name) => row[name]).filter((value): value is number => typeof value === 'number'));
  const maximum = Math.max(1, ...measured);
  const groupWidth = 580 / Math.max(1, data.length);
  const barWidth = groupWidth / Math.max(1, series.length);
  return <section className="ai-chart-card"><h3>{title}</h3>
    {!measured.length ? <p>Chưa có số đo.</p> : <svg viewBox="0 0 640 160" role="img" aria-label={title}>
      {data.flatMap((row, index) => series.map((name, seriesIndex) => {
        const value = row[name];
        if (typeof value !== 'number') return null;
        const height = value / maximum * 130;
        return <rect key={`${row.date}-${name}`} x={30 + index * groupWidth + seriesIndex * barWidth} y={145 - height}
          width={Math.max(1, barWidth - 1)} height={height} fill={COLORS[seriesIndex % COLORS.length]}><title>{row.date}: {name} {value}</title></rect>;
      }))}
    </svg>}
    <details><summary>Xem số liệu</summary><table><thead><tr><th>Ngày</th>{series.map((name) => <th key={name}>{name}</th>)}</tr></thead>
      <tbody>{data.map((row) => <tr key={row.date}><td>{row.date}</td>{series.map((name) => <td key={name}>{row[name] ?? '—'}</td>)}</tr>)}</tbody></table></details>
  </section>;
}
