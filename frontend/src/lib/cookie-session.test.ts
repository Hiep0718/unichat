import { afterEach, describe, expect, it, vi } from 'vitest';
import { loginCookieSession, refreshAccessToken } from './cookie-session';

describe('loginCookieSession', () => {
  afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

  it('should clear a pending logout before sending login', async () => {
    localStorage.setItem('unichat.logged-out', '1');
    const profile = { id: 'user-1', email: 'user@example.com', displayName: 'Người dùng',
      systemRole: 'USER', status: 'ACTIVE' };
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'access', tokenType: 'Bearer', expiresIn: 900 })))
      .mockResolvedValueOnce(new Response(JSON.stringify(profile)));
    vi.stubGlobal('fetch', request);

    await loginCookieSession({ email: 'user@example.com', password: 'valid-password' });

    expect(request.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      '/api/v1/auth/logout', '/api/v1/auth/login', '/api/v1/users/me',
    ]);
    expect(localStorage.getItem('unichat.logged-out')).toBeNull();
  });

  it('should send login directly after invalid credentials', async () => {
    const profile = { id: 'user-1', email: 'user@example.com', displayName: 'Người dùng',
      systemRole: 'USER', status: 'ACTIVE' };
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Sai mật khẩu' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'access', tokenType: 'Bearer', expiresIn: 900 })))
      .mockResolvedValueOnce(new Response(JSON.stringify(profile)));
    vi.stubGlobal('fetch', request);

    await expect(loginCookieSession({ email: profile.email, password: 'wrong' })).rejects.toThrow('Sai mật khẩu');
    await loginCookieSession({ email: profile.email, password: 'valid-password' });

    expect(request.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      '/api/v1/auth/login', '/api/v1/auth/login', '/api/v1/users/me',
    ]);
    expect(localStorage.getItem('unichat.logged-out')).toBeNull();
  });

  it('should not queue logout after an expired refresh credential', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Phiên hết hạn' }), { status: 401 }));
    vi.stubGlobal('fetch', request);

    await expect(refreshAccessToken()).rejects.toThrow('Phiên hết hạn');

    expect(request).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('unichat.logged-out')).toBeNull();
  });
});
