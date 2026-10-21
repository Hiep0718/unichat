import type { ModelDataPoint } from '../admin-api';

/** Preserves unknown measurements as separate path segments rather than fabricated zeros. */
export function modelMeasurementPath(data: readonly ModelDataPoint[], model: string, maximum: number): string {
  const step = 575 / Math.max(1, data.length - 1);
  const result = data.reduce<{ path: string; measured: boolean }>((previous, row, index) => {
    const value = row[model];
    if (typeof value !== 'number' || !Number.isFinite(value)) return { ...previous, measured: false };
    const command = previous.measured ? 'L' : 'M';
    return { path: `${previous.path} ${command} ${45 + index * step} ${172 - value / maximum * 152}`, measured: true };
  }, { path: '', measured: false });
  return result.path.trim();
}
