import { AiMeasurementChart } from './ai-measurement-chart';
import type { AiStudioMetricsResponse } from '../admin-api';

/** Separates actual requests, errors and token usage; null values never become fake zeros. */
export function AiMeasurements({ metrics }: { metrics: AiStudioMetricsResponse }) {
  return <div className="ai-studio-charts-grid">
    <AiMeasurementChart title="Tổng số yêu cầu API" data={metrics.chartRequestsSuccess.map((row) => ({ ...row }))} series={['requests']} />
    <AiMeasurementChart title="Tổng số lỗi API" data={metrics.chartErrors.map((row) => ({ ...row }))} series={['error429', 'error503', 'errorOther']} />
    <AiMeasurementChart title="Token đầu vào theo mô hình" data={metrics.chartInputTokens} series={metrics.models} />
    <AiMeasurementChart title="Token đầu ra theo mô hình" data={metrics.chartOutputTokens} series={metrics.models} />
    <AiMeasurementChart title="Số yêu cầu theo mô hình" data={metrics.chartRequestsPerModel} series={metrics.models} />
  </div>;
}
