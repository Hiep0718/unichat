// @vitest-environment node
//
// Nothing here touches the DOM: the connection is driven through a stubbed
// stompjs client. Running it outside jsdom keeps a whole browser environment
// from being built for a pure-logic suite.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StompConnection } from './stomp-connection';

/** The last client stompjs was asked to build, so a test can drive it. */
interface FakeClient {
  brokerURL: string;
  connectHeaders: Record<string, string>;
  connected: boolean;
  beforeConnect: () => Promise<void> | void;
  onConnect: () => void;
  onStompError: () => void;
  onWebSocketClose: () => void;
  activate: () => void;
  deactivate: () => Promise<void>;
  publish: (frame: { destination: string; body: string }) => void;
  subscribe: (destination: string, callback: (frame: { body: string }) => void) => {
    unsubscribe: () => void;
  };
}

const clients: FakeClient[] = [];
const published: { destination: string; body: string }[] = [];
const unsubscribed: string[] = [];

// A plain function, not an arrow: the production code calls it with `new`.
vi.mock('@stomp/stompjs', () => ({
  Client: function FakeStompClient(this: unknown, config: Partial<FakeClient>) {
    const client = {
      ...config,
      connected: false,
      activate: vi.fn(),
      deactivate: vi.fn(() => Promise.resolve()),
      publish: vi.fn((frame: { destination: string; body: string }) => published.push(frame)),
      subscribe: vi.fn((destination: string, callback: (frame: { body: string }) => void) => {
        subscriptions.set(destination, callback);
        return { unsubscribe: () => unsubscribed.push(destination) };
      }),
    } as unknown as FakeClient;
    clients.push(client);
    return client;
  },
}));

const subscriptions = new Map<string, (frame: { body: string }) => void>();

const getAccessToken = vi.fn<() => string | null>();
vi.mock('./api-client', () => ({ getAccessToken: () => getAccessToken() }));

const refreshAccessToken = vi.fn<() => Promise<string>>();
vi.mock('./cookie-session', () => ({ refreshAccessToken: () => refreshAccessToken() }));

/** Runs the client's beforeConnect, then reports it connected. */
async function completeHandshake(client: FakeClient) {
  await client.beforeConnect();
  client.connected = true;
  client.onConnect();
}

function latestClient(): FakeClient {
  const client = clients[clients.length - 1];
  if (!client) throw new Error('No client was built');
  return client;
}

describe('StompConnection', () => {
  beforeEach(() => {
    clients.length = 0;
    published.length = 0;
    unsubscribed.length = 0;
    subscriptions.clear();
    getAccessToken.mockReturnValue('token-1');
    refreshAccessToken.mockResolvedValue('token-refreshed');
  });

  afterEach(() => vi.clearAllMocks());

  it('should read the token again on every connect attempt', async () => {
    const connection = new StompConnection('ws://test/ws');
    connection.activate();
    const client = latestClient();

    await completeHandshake(client);
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer token-1' });

    // The socket dropped and stompjs is reconnecting. By now the fifteen
    // minute access token has been rotated by ordinary API traffic.
    client.onWebSocketClose();
    getAccessToken.mockReturnValue('token-2');
    await completeHandshake(client);

    // Reading the token once at setup is what broke live delivery after the
    // first expiry: stompjs replays whatever connectHeaders it was given.
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer token-2' });
  });

  it('should refresh rather than replay a credential the broker just refused', async () => {
    const connection = new StompConnection('ws://test/ws');
    connection.activate();
    const client = latestClient();
    await completeHandshake(client);

    client.onStompError();
    await completeHandshake(client);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer token-refreshed' });
  });

  it('should restore every subscription after a reconnect', async () => {
    const connection = new StompConnection('ws://test/ws');
    const received: string[] = [];
    connection.subscribe('/user/queue/messages', (body) => received.push(body));
    connection.activate();
    const client = latestClient();

    await completeHandshake(client);
    subscriptions.get('/user/queue/messages')?.({ body: 'first' });

    client.onWebSocketClose();
    await completeHandshake(client);
    subscriptions.get('/user/queue/messages')?.({ body: 'second' });

    // A feature that subscribed once must keep receiving across a drop, without
    // having to notice the drop itself.
    expect(received).toEqual(['first', 'second']);
  });

  it('should subscribe a destination once however many listeners it has', async () => {
    const connection = new StompConnection('ws://test/ws');
    connection.activate();
    await completeHandshake(latestClient());

    const first: string[] = [];
    const second: string[] = [];
    const dropFirst = connection.subscribe('/user/queue/calls', (b) => first.push(b));
    connection.subscribe('/user/queue/calls', (b) => second.push(b));

    expect(latestClient().subscribe).toHaveBeenCalledTimes(1);

    subscriptions.get('/user/queue/calls')?.({ body: 'ring' });
    expect(first).toEqual(['ring']);
    expect(second).toEqual(['ring']);

    // The shared subscription stays while anyone is still listening.
    dropFirst();
    expect(unsubscribed).toEqual([]);
  });

  it('should keep delivering to the other listeners when one throws', async () => {
    const connection = new StompConnection('ws://test/ws');
    connection.activate();
    await completeHandshake(latestClient());

    const survivor: string[] = [];
    connection.subscribe('/user/queue/calls', () => {
      throw new Error('boom');
    });
    connection.subscribe('/user/queue/calls', (b) => survivor.push(b));

    subscriptions.get('/user/queue/calls')?.({ body: 'ring' });

    expect(survivor).toEqual(['ring']);
  });

  it('should drop a frame published while the connection is down', () => {
    const connection = new StompConnection('ws://test/ws');
    connection.activate();

    // Queueing it to arrive minutes later would be worse than not sending it:
    // everything published here is ephemeral or has a REST path behind it.
    expect(connection.publish('/app/calls/1/signal', { kind: 'ICE' })).toBe(false);
    expect(published).toEqual([]);
  });

  it('should report connection state to watchers', async () => {
    const connection = new StompConnection('ws://test/ws');
    const seen: boolean[] = [];
    connection.watchStatus((state) => seen.push(state));
    connection.activate();

    await completeHandshake(latestClient());
    latestClient().onWebSocketClose();

    expect(seen).toEqual([false, true, false]);
  });
});
