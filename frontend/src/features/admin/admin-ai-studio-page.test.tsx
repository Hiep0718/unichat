import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAiStudioPage } from './admin-ai-studio-page';
import { fetchAiStudioMetrics, sendQuickPrompt, testGeminiKey } from './admin-api';
import type { AiStudioMetricsResponse } from './admin-api';

vi.mock('./admin-api', () => ({ fetchAiStudioMetrics: vi.fn(), sendQuickPrompt: vi.fn(), testGeminiKey: vi.fn() }));
const metrics: AiStudioMetricsResponse = {
  status: 'NO_DATA', completeness: 'PARTIAL', sampleCount: 0, updatedAt: '2026-10-11T00:00:00Z',
  retainedFrom: null, registryStatus: 'AVAILABLE', tier: 'UNKNOWN', timeRangeDays: 28,
  keys: [{ keyId: 'gemini-primary', name: 'Key A', maskedKey: '***A', isConfigured: true },
    { keyId: 'gemini-secondary', name: 'Key B', maskedKey: '***B', isConfigured: true }],
  models: [], configuredModels: ['gemini-2.5-flash'], chartRequestsSuccess: [], chartErrors: [], chartInputTokens: [],
  chartOutputTokens: [], chartRequestsPerModel: [], summary: { totalRequests: 0, totalErrors: 0, overallSuccessRate: null },
};
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AdminAiStudioPage /></QueryClientProvider>);
}
describe('AdminAiStudioPage', () => {
  afterEach(cleanup);
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchAiStudioMetrics).mockResolvedValue(metrics); });
  it('should show incomplete no-data measurements without fabricated success or usage', async () => {
    renderPage();
    expect(await screen.findByText('Chưa có mẫu đo trong khoảng thời gian này.')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText(/Độ đầy đủ: PARTIAL/)).toBeInTheDocument();
    for (const title of ['Total API Requests', 'Total API Errors', 'Input Tokens per model', 'Output Tokens per model', 'Requests per model']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
  });
  it('should use selected key B and an explicit registry model for both checks', async () => {
    vi.mocked(testGeminiKey).mockResolvedValue({ status: 'UNAVAILABLE', message: 'Unavailable', latencyMs: null, probeType: 'METADATA' });
    vi.mocked(sendQuickPrompt).mockResolvedValue({ status: 'SUCCESS', reply: 'Kết quả', latencyMs: 12, tokensUsed: null, model: 'gemini-2.5-flash' });
    renderPage(); await screen.findByText('***B', { exact: false });
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'gemini-secondary' } });
    fireEvent.click(await screen.findByText('Kiểm metadata Key B'));
    await waitFor(() => expect(testGeminiKey).toHaveBeenCalledWith('gemini-secondary'));
    await screen.findByText(/UNAVAILABLE · Metadata/);
    fireEvent.change(screen.getByLabelText('Prompt trực tiếp'), { target: { value: 'Xin chào' } });
    fireEvent.click(screen.getByText('Gửi prompt'));
    await waitFor(() => expect(sendQuickPrompt).toHaveBeenCalledWith('Xin chào', 'gemini-secondary', 'gemini-2.5-flash'));
    expect(await screen.findByText('Kết quả')).toBeInTheDocument();
  });
  it('should expose dependency failure instead of displaying healthy fixtures', async () => {
    vi.mocked(fetchAiStudioMetrics).mockRejectedValue(new Error('Dịch vụ không khả dụng'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ không khả dụng');
    expect(screen.queryByText('HEALTHY')).not.toBeInTheDocument();
  });
});
