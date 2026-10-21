import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchJson } from '../../lib/api-client';
import { fetchAdminAuditEvents, fetchAdminUsers, fetchAiAdmission, fetchAiStudioMetrics, sendQuickPrompt, testGeminiKey, testProviderKey, updateAiAdmission,
  updateAdminUserRole, updateAdminUserStatus } from './admin-api';
vi.mock('../../lib/api-client', () => ({ fetchJson: vi.fn() }));
const userId = '11111111-1111-4111-8111-111111111111';
describe('AdminApi', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchJson).mockResolvedValue({}); });
  it('should send expected version with both role and status mutations', async () => {
    await updateAdminUserRole(userId, 'ADMIN', 7);
    await updateAdminUserStatus(userId, 'LOCKED', 8);
    expect(fetchJson).toHaveBeenNthCalledWith(1, `/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ systemRole: 'ADMIN', expectedVersion: 7 }) });
    expect(fetchJson).toHaveBeenNthCalledWith(2, `/admin/users/${userId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'LOCKED', expectedVersion: 8 }) });
  });
  it('should reject invalid identities versions pagination and key indices before HTTP', async () => {
    await expect(updateAdminUserRole('invalid', 'ADMIN', 0)).rejects.toThrow();
    await expect(updateAdminUserStatus(userId, 'LOCKED', -1)).rejects.toThrow();
    await expect(fetchAdminUsers('', 0, 101)).rejects.toThrow();
    await expect(testGeminiKey('0')).rejects.toThrow();
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it('should preserve stable key selection in filters probes and direct prompts', async () => {
    await fetchAiStudioMetrics(7, 'gemini-secondary', 'gemini-2.5-flash');
    await testGeminiKey('gemini-secondary');
    await sendQuickPrompt('Tiếng Việt', 'gemini-secondary', 'gemini-2.5-flash');
    expect(fetchJson).toHaveBeenNthCalledWith(1, '/admin/ai-studio/metrics?days=7&keyId=gemini-secondary&model=gemini-2.5-flash');
    expect(fetchJson).toHaveBeenNthCalledWith(2, '/admin/ai-studio/test-key', { method: 'POST', body: JSON.stringify({ keyId: 'gemini-secondary' }) });
    expect(fetchJson).toHaveBeenNthCalledWith(3, '/admin/ai-studio/quick-prompt', { method: 'POST', body: JSON.stringify({ prompt: 'Tiếng Việt', keyId: 'gemini-secondary', model: 'gemini-2.5-flash' }) });
  });
  it('should request audit pagination and encoded metadata filters', async () => {
    await fetchAdminAuditEvents(2, 'LOGIN_FAILURE', 'FAILURE');
    expect(fetchJson).toHaveBeenCalledWith('/admin/audit-events?page=2&size=20&action=LOGIN_FAILURE&outcome=FAILURE');
  });
  it('should send only the Hive key identity in probes and retain the compatibility alias', async () => {
    await testProviderKey('hive-list-123456abcdef');
    expect(testGeminiKey).toBe(testProviderKey);
    expect(fetchJson).toHaveBeenCalledExactlyOnceWith('/admin/ai-studio/test-key', {
      method: 'POST', body: JSON.stringify({ keyId: 'hive-list-123456abcdef' }),
    });
  });
  it('should encode slash models in historical filters and allow nonblank prompts through 2000 characters', async () => {
    const model = 'deepseek-ai/deepseek-v4.1-flash';
    await fetchAiStudioMetrics(7, 'hive-primary', model);
    await sendQuickPrompt('a'.repeat(2000), 'hive-primary', model);
    expect(fetchJson).toHaveBeenNthCalledWith(1, `/admin/ai-studio/metrics?days=7&keyId=hive-primary&model=${encodeURIComponent(model)}`);
    expect(fetchJson).toHaveBeenNthCalledWith(2, '/admin/ai-studio/quick-prompt', {
      method: 'POST', body: JSON.stringify({ prompt: 'a'.repeat(2000), keyId: 'hive-primary', model }),
    });
  });
  it.each(['', '   ', 'a'.repeat(2001)])('should reject invalid prompt before HTTP', async (prompt) => {
    await expect(sendQuickPrompt(prompt, 'hive-primary', 'deepseek-ai/deepseek-v4.1-flash')).rejects.toThrow();
    expect(fetchJson).not.toHaveBeenCalled();
  });
  it('should read admission and mutate only the reviewed state and version', async () => {
    await fetchAiAdmission();
    await updateAiAdmission('VERIFYING', 9);
    expect(fetchJson).toHaveBeenNthCalledWith(1, '/admin/ai-studio/admission');
    expect(fetchJson).toHaveBeenNthCalledWith(2, '/admin/ai-studio/admission', {
      method: 'PUT', body: JSON.stringify({ state: 'VERIFYING', expectedVersion: 9 }),
    });
    expect(() => updateAiAdmission('OPEN', -1)).toThrow();
  });
});
