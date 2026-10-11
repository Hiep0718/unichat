import * as storage from '../../src/lib/secure-store';
import { getSessionSnapshot, invalidateSession } from '../../src/lib/session-store';
import { loginSession, logoutSession, restoreSession } from '../../src/lib/native-session';

jest.mock('../../src/lib/api-origin', () => ({ getApiBaseUrl: () => 'http://localhost:8080' }));
jest.mock('../../src/lib/secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
const fetchMock = jest.fn();
const records = new Map<string, string>();
const auth = { accessToken: 'access', refreshToken: 'opaque-refresh', tokenType: 'Bearer', expiresIn: 900 };
function response(data: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify(data) } as Response;
}
describe('NativeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks(); records.clear(); invalidateSession();
    global.fetch = fetchMock;
    jest.mocked(storage.getItemAsync).mockImplementation(async (key) => records.get(key) ?? null);
    jest.mocked(storage.setItemAsync).mockImplementation(async (key, value) => { records.set(key, value); });
    jest.mocked(storage.deleteItemAsync).mockImplementation(async (key) => { records.delete(key); });
    fetchMock.mockImplementation(async (url: string) => response(url.endsWith('/users/me')
      ? { id: 'user', status: 'ACTIVE', systemRole: 'USER' } : auth));
  });
  it('should persist refresh only and require me before authenticating', async () => {
    await loginSession({ email: 'user@example.com', password: 'legacy-valid' });
    expect(getSessionSnapshot().status).toBe('authenticated');
    expect(records.get('unichat_session')).toBe(JSON.stringify({ version: 1, state: 'ACTIVE', refreshToken: auth.refreshToken }));
    expect(storage.setItemAsync).not.toHaveBeenCalledWith('access_token', expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/users/me'), expect.anything());
  });
  it('should fail login when the refresh record cannot be persisted', async () => {
    jest.mocked(storage.setItemAsync).mockRejectedValueOnce(new Error('Keychain unavailable'));
    await expect(loginSession({ email: 'user@example.com', password: 'legacy-valid' })).rejects.toThrow('Keychain unavailable');
    expect(getSessionSnapshot().status).not.toBe('authenticated');
    expect(getSessionSnapshot().token).toBeNull();
  });
  it('should delete the active record if logout tombstone fails while offline', async () => {
    await loginSession({ email: 'user@example.com', password: 'legacy-valid' });
    jest.mocked(storage.setItemAsync).mockRejectedValueOnce(new Error('write failed'));
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(logoutSession()).rejects.toThrow('offline');
    expect(storage.deleteItemAsync).toHaveBeenCalledWith('unichat_session');
    expect(getSessionSnapshot().token).toBeNull();
    fetchMock.mockClear();
    await restoreSession();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('should report unavailable storage without restoring corrupt credentials', async () => {
    records.set('unichat_session', '{broken');
    await expect(restoreSession()).rejects.toThrow();
    expect(getSessionSnapshot().token).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
