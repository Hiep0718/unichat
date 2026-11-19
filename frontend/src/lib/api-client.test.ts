import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchJson, fetchPublicJson } from './api-client';
import { invalidateSession } from './session-store';

/** A fetch whose response arrives only when the test says so. */
function deferredFetch() {
  let respond: (body: unknown) => void = () => {};
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        respond = (body) =>
          resolve(new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }));
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, respond: (body: unknown) => respond(body) };
}

describe('fetchPublicJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a public answer when the session is invalidated while it loads', async () => {
    // Arrange: a signed-out visitor opens an invite link; the failed session
    // restore invalidates the session while the preview is still in flight.
    const { respond } = deferredFetch();
    const preview = { workspaceName: 'Khoa học dữ liệu' };

    // Act
    const pending = fetchPublicJson('/invites/token');
    invalidateSession();
    respond(preview);

    // Assert
    await expect(pending).resolves.toEqual(preview);
  });

  it('sends no credentials header, since the answer is the same for everyone', async () => {
    // Arrange
    const { fetchMock, respond } = deferredFetch();

    // Act
    const pending = fetchPublicJson('/invites/token');
    respond({});
    await pending;

    // Assert
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/invites/token');
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('is needed because a session-bound read rejects in the same situation', async () => {
    // Arrange
    const { respond } = deferredFetch();

    // Act
    const pending = fetchJson('/invites/token');
    invalidateSession();
    respond({});

    // Assert: this is what the invite page showed as a dead link.
    await expect(pending).rejects.toThrow('Phiên đã thay đổi');
  });
});
