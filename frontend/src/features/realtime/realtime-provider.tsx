/* eslint-disable react-refresh/only-export-components */
/**
 * Holds the application's one STOMP connection for as long as someone is
 * signed in.
 *
 * Mounted above the routes rather than inside a page, so moving between the
 * workspace shell and the main shell does not tear the socket down and build
 * it again. Features ask for the destinations they care about through
 * {@link useRealtimeSubscription}.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../auth/auth-context';
import { StompConnection, workChatSocketUrl } from '../../lib/stomp-connection';

import type { ReactNode } from 'react';
import type { FrameHandler } from '../../lib/stomp-connection';

const RealtimeContext = createContext<StompConnection | null>(null);

export function RealtimeProvider({ children }: { readonly children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  // One connection per provider instance, kept across re-renders. Building it
  // here rather than at module scope keeps it out of tests that never mount
  // the provider.
  const connection = useMemo(() => new StompConnection(workChatSocketUrl()), []);

  useEffect(() => {
    if (!isAuthenticated) {
      // Signing out must drop the socket: it is authenticated by the token
      // sent at CONNECT, so leaving it open would leave the previous person's
      // deliveries arriving in the next person's browser.
      connection.deactivate();
      return;
    }

    connection.activate();
    return () => connection.deactivate();
  }, [isAuthenticated, connection]);

  return <RealtimeContext.Provider value={connection}>{children}</RealtimeContext.Provider>;
}

/**
 * The shared connection, or null outside the provider.
 *
 * Null rather than throwing, because live delivery is a convenience
 * everywhere it is used: a tree rendered without the provider — a test, a
 * public page — should still work, just without push.
 */
export function useRealtime(): StompConnection | null {
  return useContext(RealtimeContext);
}

/**
 * Listens on a destination for as long as the component is mounted.
 *
 * The handler is read through a ref inside the effect, so passing a new
 * function on every render does not resubscribe.
 *
 * @param destination a user destination such as `/user/queue/messages`
 * @param handler called with the raw body of each frame
 */
export function useRealtimeSubscription(destination: string, handler: FrameHandler): void {
  const connection = useRealtime();
  const latest = useRef(handler);

  // Assigned in an effect rather than during render: mutating a ref while
  // rendering is not safe under concurrent rendering.
  useEffect(() => {
    latest.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!connection) return;
    return connection.subscribe(destination, (body) => latest.current(body));
  }, [connection, destination]);
}

/** Whether push is currently working, for an unobtrusive indicator. */
export function useRealtimeStatus(): boolean {
  const connection = useRealtime();
  const [connected, setConnected] = useState(() => connection?.isConnected() ?? false);

  useEffect(() => {
    if (!connection) return;
    return connection.watchStatus(setConnected);
  }, [connection]);

  return connected;
}
