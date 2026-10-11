import { AiMeasurementChart } from './ai-measurement-chart';
import type { AiStudioMetricsResponse } from '../admin-api';

/** Separates actual requests, errors and token usage; null values never become fake zeros. */
export function AiMeasurements({ metrics }: { metrics: AiStudioMetricsResponse }) {
  return <div className="ai-studio-charts-grid">
    <AiMeasurementChart title="Total API Requests" data={metrics.chartRequestsSuccess.map((row) => ({ ...row }))} series={['requests']} />
    <AiMeasurementChart title="Total API Errors" data={metrics.chartErrors.map((row) => ({ ...row }))} series={['error429', 'error503', 'errorOther']} />
    <AiMeasurementChart title="Input Tokens per model" data={metrics.chartInputTokens} series={metrics.models} />
    <AiMeasurementChart title="Output Tokens per model" data={metrics.chartOutputTokens} series={metrics.models} />
    <AiMeasurementChart title="Requests per model" data={metrics.chartRequestsPerModel} series={metrics.models} />
  </div>;
}
