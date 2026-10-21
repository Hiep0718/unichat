import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api-error';
import { fetchAiAdmission, updateAiAdmission } from '../admin-api';
import { AiAdmissionControl } from './ai-admission-control';
import { admissionTransitions } from './ai-admission-policy';
import type { AiAdmission } from '../admin-api';

vi.mock('../admin-api', () => ({ fetchAiAdmission: vi.fn(), updateAiAdmission: vi.fn() }));
const drained: AiAdmission = { state: 'DRAINING', version: 7, runningOperationCount: 0, pendingAttemptCount: 0 };
function renderControl() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AiAdmissionControl /></QueryClientProvider>);
}
describe('AiAdmissionControl', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchAiAdmission).mockResolvedValue(drained); });
  afterEach(cleanup);
  it.each([[1, 0], [0, 1], [1, 1]])('should block verification when running=%s pending=%s', (runningOperationCount, pendingAttemptCount) => {
    expect(admissionTransitions({ ...drained, runningOperationCount, pendingAttemptCount })).toEqual(['OPEN']);
  });
  it('should allow only explicit safe state transitions', () => {
    expect(admissionTransitions({ ...drained, state: 'OPEN' })).toEqual(['DRAINING']);
    expect(admissionTransitions(drained)).toEqual(['VERIFYING', 'OPEN']);
    expect(admissionTransitions({ ...drained, state: 'VERIFYING' })).toEqual(['DRAINING', 'OPEN']);
  });
  it('should require confirmation before verifying and never reopen automatically', async () => {
    vi.mocked(updateAiAdmission).mockResolvedValue({ ...drained, state: 'VERIFYING', version: 8 });
    vi.mocked(fetchAiAdmission).mockResolvedValueOnce(drained).mockResolvedValue({ ...drained, state: 'VERIFYING', version: 8 });
    renderControl();
    fireEvent.click(await screen.findByRole('button', { name: 'Chuyển sang VERIFYING' }));
    expect(updateAiAdmission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thay đổi' }));
    await waitFor(() => expect(updateAiAdmission).toHaveBeenCalledExactlyOnceWith('VERIFYING', 7));
    await screen.findByText(/Trạng thái: VERIFYING/);
    expect(updateAiAdmission).toHaveBeenCalledTimes(1);
  });
  it('should refresh stale state and require a fresh confirmation after conflict', async () => {
    vi.mocked(updateAiAdmission).mockRejectedValue(new ApiError(409, 'stale'));
    vi.mocked(fetchAiAdmission).mockResolvedValueOnce(drained).mockResolvedValue({ ...drained, version: 8, pendingAttemptCount: 1 });
    renderControl(); fireEvent.click(await screen.findByRole('button', { name: 'Chuyển sang VERIFYING' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thay đổi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Trạng thái đã thay đổi');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chuyển sang VERIFYING' })).not.toBeInTheDocument();
    expect(updateAiAdmission).toHaveBeenCalledTimes(1);
  });
  it('should fail closed when admission metadata cannot be read', async () => {
    vi.mocked(fetchAiAdmission).mockRejectedValue(new Error('unavailable'));
    renderControl();
    expect(await screen.findByRole('alert')).toHaveTextContent('Vui lòng tải lại trước khi thay đổi');
    expect(screen.queryByRole('button', { name: 'Chuyển sang OPEN' })).not.toBeInTheDocument();
    expect(updateAiAdmission).not.toHaveBeenCalled();
  });
});
