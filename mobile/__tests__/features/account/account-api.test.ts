import { accountApi, avatarSource } from '../../../src/features/account/account-api';
import * as apiClient from '../../../src/lib/api-client';

jest.mock('../../../src/lib/api-client', () => ({
  fetchJson: jest.fn(),
  fetchAuthorized: jest.fn(),
  getAccessToken: jest.fn(() => 'token-abc'),
  getApiBaseUrl: jest.fn(() => 'http://localhost:8082'),
}));

const fetchJson = apiClient.fetchJson as jest.MockedFunction<typeof apiClient.fetchJson>;
const fetchAuthorized = apiClient.fetchAuthorized as jest.MockedFunction<
  typeof apiClient.fetchAuthorized
>;

describe('accountApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renames the caller through PATCH /users/me', async () => {
    fetchJson.mockResolvedValueOnce({ id: 'u1', email: 'a@b.c', displayName: 'Hùng' });

    await accountApi.updateDisplayName('Hùng');

    expect(fetchJson).toHaveBeenCalledWith('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: 'Hùng' }),
    });
  });

  it('sends the chosen colour as a query parameter', async () => {
    fetchJson.mockResolvedValueOnce(undefined);

    await accountApi.chooseAvatarColor('plum');

    expect(fetchJson).toHaveBeenCalledWith('/users/me/avatar-color?color=plum', {
      method: 'PATCH',
    });
  });

  it('omits the parameter when returning to the derived colour', async () => {
    fetchJson.mockResolvedValueOnce(undefined);

    await accountApi.chooseAvatarColor(null);

    expect(fetchJson).toHaveBeenCalledWith('/users/me/avatar-color', { method: 'PATCH' });
  });

  it('uploads the picture as multipart and reports a rejected upload', async () => {
    fetchAuthorized.mockResolvedValueOnce({ ok: false, status: 413 } as Response);

    await expect(
      accountApi.uploadAvatar({ uri: 'file:///a.png', name: 'a.png', type: 'image/png' }),
    ).rejects.toThrow('Không tải được ảnh lên (HTTP 413)');

    const [endpoint, options] = fetchAuthorized.mock.calls[0];
    expect(endpoint).toBe('/users/me/avatar');
    expect(options?.method).toBe('PUT');
    expect(options?.body).toBeInstanceOf(FormData);
  });

  it('builds an authorised, cache-busting avatar source', () => {
    expect(avatarSource('u1', 3)).toEqual({
      uri: 'http://localhost:8082/api/v1/users/u1/avatar?v=3',
      headers: { Authorization: 'Bearer token-abc' },
    });
  });
});
