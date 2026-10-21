import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAiStudioPage } from './admin-ai-studio-page';
import { fetchAiAdmission, fetchAiStudioMetrics, sendQuickPrompt, testProviderKey } from './admin-api';
import type { AiStudioMetricsResponse } from './admin-api';

vi.mock('./admin-api', () => ({ fetchAiStudioMetrics: vi.fn(), fetchAiAdmission: vi.fn(),
  sendQuickPrompt: vi.fn(), testProviderKey: vi.fn(), updateAiAdmission: vi.fn() }));
const model = 'deepseek-ai/deepseek-v4.1-flash';
const metrics: AiStudioMetricsResponse = {
  status: 'NO_DATA', completeness: 'PARTIAL', sampleCount: 0, updatedAt: '2026-10-11T00:00:00Z',
  retainedFrom: null, registryStatus: 'AVAILABLE', tier: 'UNKNOWN', timeRangeDays: 28,
  activeProvider: 'hive', activeModel: model, historicalKeys: [{ keyId: 'gemini-primary', provider: 'gemini' }],
  keys: [{ keyId: 'hive-primary', name: 'Hive chính', maskedKey: '***A', isConfigured: true,
    provider: 'hive', isActive: true, supportedModels: [model] },
  { keyId: 'hive-secondary', name: 'Hive dự phòng', maskedKey: '***B', isConfigured: true,
    provider: 'hive', isActive: true, supportedModels: [model] }],
  models: ['gemini-2.5-flash'], configuredModels: [model], chartRequestsSuccess: [], chartErrors: [], chartInputTokens: [],
  chartOutputTokens: [], chartRequestsPerModel: [], summary: { totalRequests: 0, totalErrors: 0, overallSuccessRate: null },
};
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AdminAiStudioPage /></QueryClientProvider>);
}
function selectDiagnostics() {
  fireEvent.change(screen.getByLabelText('Khóa kiểm tra'), { target: { value: 'hive-secondary' } });
  fireEvent.change(screen.getByLabelText('Mô hình kiểm tra'), { target: { value: model } });
}

describe('AdminAiStudioPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks(); vi.mocked(fetchAiStudioMetrics).mockResolvedValue(metrics);
    vi.mocked(fetchAiAdmission).mockResolvedValue({ state: 'OPEN', version: 1, runningOperationCount: 0, pendingAttemptCount: 0 });
  });
  it('should show truthful no-data measurements and never probe on page load', async () => {
    renderPage();
    expect(await screen.findByText('Chưa có mẫu đo trong khoảng thời gian này.')).toBeInTheDocument();
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
    expect(screen.getByText(/Độ đầy đủ: PARTIAL/)).toBeInTheDocument();
    expect(screen.getByText(/Nhà cung cấp đang hoạt động: hive/)).toHaveTextContent(model);
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(testProviderKey).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Kiểm tra API key' })).toBeDisabled();
  });
  it('should keep historical filters separate from explicit Hive diagnostic selection', async () => {
    vi.mocked(testProviderKey).mockResolvedValue({ status: 'HEALTHY', message: 'OK', latencyMs: 3, probeType: 'GENERATION' });
    vi.mocked(sendQuickPrompt).mockResolvedValue({ status: 'SUCCESS', reply: 'Kết quả', latencyMs: 12, tokensUsed: null, model });
    renderPage(); await screen.findByText(/Nhà cung cấp đang hoạt động/);
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'gemini-primary' } });
    fireEvent.change(screen.getByLabelText('Mô hình'), { target: { value: 'gemini-2.5-flash' } });
    expect(screen.getByLabelText('Khóa kiểm tra')).toHaveValue('');
    selectDiagnostics();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra API key' }));
    await waitFor(() => expect(testProviderKey).toHaveBeenCalledWith('hive-secondary'));
    await screen.findByText(/HEALTHY · Sinh nội dung/);
    fireEvent.change(screen.getByLabelText('Prompt trực tiếp'), { target: { value: 'Xin chào' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi prompt' }));
    await waitFor(() => expect(sendQuickPrompt).toHaveBeenCalledWith('Xin chào', 'hive-secondary', model));
    expect(await screen.findByText('Kết quả')).toBeInTheDocument();
    expect(screen.getByText(/tiêu thụ tín dụng/)).toBeInTheDocument();
  });
  it('should disable diagnostics when active metadata is unavailable', async () => {
    vi.mocked(fetchAiStudioMetrics).mockResolvedValue({ ...metrics, activeProvider: null, activeModel: null });
    renderPage(); await screen.findByText(/Chưa có metadata nhà cung cấp/); selectDiagnostics();
    expect(screen.getByRole('button', { name: 'Kiểm tra API key' })).toBeDisabled();
    expect(testProviderKey).not.toHaveBeenCalled();
  });
  it('should block diagnostics during draining', async () => {
    vi.mocked(fetchAiAdmission).mockResolvedValue({ state: 'DRAINING', version: 2, runningOperationCount: 1, pendingAttemptCount: 0 });
    renderPage(); await screen.findByText(/Nhà cung cấp đang hoạt động/); selectDiagnostics();
    expect(screen.getByRole('button', { name: 'Kiểm tra API key' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Chuyển sang VERIFYING' })).not.toBeInTheDocument();
  });
  it('should expose dependency failure instead of displaying healthy fixtures', async () => {
    vi.mocked(fetchAiStudioMetrics).mockRejectedValue(new Error('Dịch vụ không khả dụng'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Dịch vụ không khả dụng');
    expect(screen.queryByText('HEALTHY')).not.toBeInTheDocument();
  });
});
