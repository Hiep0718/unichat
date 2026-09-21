/**
 * Live delivery of Work Chat messages over STOMP.
 *
 * The socket is a convenience, not the source of truth: every message is
 * already stored before it is pushed, so a page that fails to connect still
 * shows everything on its next load. Nothing here blocks sending.
 */
import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';

import { getAccessToken } from '../../lib/api-client';
import type { DirectMessage } from './work-chat-api';

/** Spring scopes this destination to the connected principal. */
const DESTINATION = '/user/queue/messages';
const RECONNECT_MS = 5000;
const HEARTBEAT_MS = 10000;

/**
 * Subscribes to the caller's message queue for as long as the component lives.
 *
 * @param onMessage called for each message the server pushes
 * @returns whether the connection is currently up, for an unobtrusive indicator
 */
export function useWorkChatSocket(onMessage: (message: DirectMessage) => void): boolean {
  const [connected, setConnected] = useState(false);
  // The subscription outlives each render, so the handler is read from a ref
  // rather than captured — otherwise reconnecting on every new callback
  // identity would tear the socket down constantly.
  const handlerRef = useRef(onMessage);

  // Assigned in an effect rather than during render: mutating a ref while
  // rendering is not safe under concurrent rendering.
  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const client = new Client({
      brokerURL: `${protocol}//${window.location.host}/ws/work-chat`,
      // A browser cannot set headers on the handshake, so the token travels on
      // the CONNECT frame, which is where the server authenticates it.
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: RECONNECT_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      onConnect: () => {
        setConnected(true);
        client.subscribe(DESTINATION, (frame) => {
          try {
            handlerRef.current(JSON.parse(frame.body) as DirectMessage);
          } catch {
            // A frame we cannot parse is dropped rather than crashing the
            // subscription; the message is still on the server.
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, []);

  return connected;
}
