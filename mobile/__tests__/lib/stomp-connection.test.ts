import { StompConnection, workChatSocketUrl } from '../../src/lib/stomp-connection';
import { getAccessToken, getOrRefreshToken } from '../../src/lib/api-client';

import type { Client, StompConfig } from '@stomp/stompjs';

jest.mock('../../src/lib/api-client', () => ({
  getAccessToken: jest.fn(),
  getOrRefreshToken: jest.fn(),
  getApiBaseUrl: () => 'http://10.0.0.5:8082',
}));

type Config = StompConfig & Record<string, unknown>;

/** A stand-in for stompjs that records what the connection asks of it. */
function fakeClient() {
  const frameHandlers = new Map<string, (frame: { body: string }) => void>();
  const unsubscribe = jest.fn();
  let config = {} as Config;
  const client = {
    connected: false,
    connectHeaders: {} as Record<string, string>,
    activate: jest.fn(),
    deactivate: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn((destination: string, handler: (frame: { body: string }) => void) => {
      frameHandlers.set(destination, handler);
      return { unsubscribe };
    }),
  };
  const factory = jest.fn((received: StompConfig) => {
    config = received as Config;
    return client as unknown as Client;
  });
  return {
    client,
    factory,
    unsubscribe,
    config: () => config,
    connect: () => {
      client.connected = true;
      (config.onConnect as () => void)();
    },
    deliver: (destination: string, body: string) => frameHandlers.get(destination)?.({ body }),
  };
}

describe('workChatSocketUrl', () => {
  it('derives the socket address from the API origin', () => {
    expect(workChatSocketUrl('http://10.0.0.5:8082')).toBe('ws://10.0.0.5:8082/ws/work-chat');
    expect(workChatSocketUrl('https://api.unichat.vn')).toBe('wss://api.unichat.vn/ws/work-chat');
  });
});

describe('StompConnection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enables the React Native frame workarounds on a native platform', () => {
    const fake = fakeClient();
    new StompConnection('ws://x', fake.factory).activate();

    expect(fake.config().forceBinaryWSFrames).toBe(true);
    expect(fake.config().appendMissingNULLonIncoming).toBe(true);
    expect(fake.client.activate).toHaveBeenCalledTimes(1);
  });

  it('activates only once', () => {
    const fake = fakeClient();
    const connection = new StompConnection('ws://x', fake.factory);

    connection.activate();
    connection.activate();

    expect(fake.factory).toHaveBeenCalledTimes(1);
  });

  it('sends the current access token on CONNECT', async () => {
    jest.mocked(getAccessToken).mockReturnValue('access-1');
    const fake = fakeClient();
    new StompConnection('ws://x', fake.factory).activate();

    await (fake.config().beforeConnect as () => Promise<void>)();

    expect(fake.client.connectHeaders).toEqual({ Authorization: 'Bearer access-1' });
  });

  it('refreshes the token instead of replaying one the broker rejected', async () => {
    jest.mocked(getAccessToken).mockReturnValue('stale');
    jest.mocked(getOrRefreshToken).mockResolvedValue('fresh');
    const fake = fakeClient();
    new StompConnection('ws://x', fake.factory).activate();

    (fake.config().onStompError as () => void)();
    await (fake.config().beforeConnect as () => Promise<void>)();

    expect(fake.client.connectHeaders).toEqual({ Authorization: 'Bearer fresh' });
  });

  it('connects without credentials when no token can be obtained', async () => {
    jest.mocked(getAccessToken).mockReturnValue(null);
    jest.mocked(getOrRefreshToken).mockRejectedValue(new Error('signed out'));
    const fake = fakeClient();
    new StompConnection('ws://x', fake.factory).activate();

    await (fake.config().beforeConnect as () => Promise<void>)();

    expect(fake.client.connectHeaders).toEqual({});
  });

  it('subscribes remembered destinations once connected and dispatches frames', () => {
    const fake = fakeClient();
    const connection = new StompConnection('ws://x', fake.factory);
    const handler = jest.fn();
    connection.subscribe('/user/queue/messages', handler);
    connection.activate();

    fake.connect();
    fake.deliver('/user/queue/messages', '{"id":"m1"}');

    expect(handler).toHaveBeenCalledWith('{"id":"m1"}');
  });

  it('keeps other listeners running when one throws', () => {
    const fake = fakeClient();
    const connection = new StompConnection('ws://x', fake.factory);
    const healthy = jest.fn();
    connection.subscribe('/q', () => { throw new Error('boom'); });
    connection.subscribe('/q', healthy);
    connection.activate();
    fake.connect();

    fake.deliver('/q', 'frame');

    expect(healthy).toHaveBeenCalledWith('frame');
  });

  it('drops the broker subscription when the last listener leaves', () => {
    const fake = fakeClient();
    const connection = new StompConnection('ws://x', fake.factory);
    connection.activate();
    fake.connect();
    const stop = connection.subscribe('/q', jest.fn());

    stop();

    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('reports status changes and closes the client on deactivate', () => {
    const fake = fakeClient();
    const connection = new StompConnection('ws://x', fake.factory);
    const status = jest.fn();
    connection.watchStatus(status);
    connection.activate();

    fake.connect();
    connection.deactivate();

    expect(status.mock.calls.map(([value]) => value)).toEqual([false, true, false]);
    expect(fake.client.deactivate).toHaveBeenCalled();
    expect(connection.isConnected()).toBe(false);
  });
});
