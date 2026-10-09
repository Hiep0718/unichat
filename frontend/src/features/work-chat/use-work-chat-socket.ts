/**
 * Live delivery of Work Chat messages over STOMP.
 *
 * The socket is a convenience, not the source of truth: every message is
 * already stored before it is pushed, so a page that fails to connect still
 * shows everything on its next load. Nothing here blocks sending.
 *
 * Two destinations, both scoped to the connected user: messages, and a nudge
 * that the conversation list changed. The second exists because being added to
 * a group sends no message, so without it the group would not appear until the
 * page was reloaded.
 */
import { Client } from '@stomp/stompjs';
import { useEffect, useRef, useState } from 'react';

import { getAccessToken } from '../../lib/api-client';
import type { DirectMessage } from './work-chat-api';

/** Spring scopes these destinations to the connected principal. */
const MESSAGES = '/user/queue/messages';
const CONVERSATIONS = '/user/queue/conversations';
const RECONNECT_MS = 5000;
const HEARTBEAT_MS = 10000;

/**
 * Subscribes to the caller's queues for as long as the component lives.
 *
 * @param onMessage called for each message the server pushes
 * @param onConversationsChanged called when the caller's list of conversations
 *        changed without a message — added to a group, removed, or renamed
 * @returns whether the connection is currently up, for an unobtrusive indicator
 */
export function useWorkChatSocket(
  onMessage: (message: DirectMessage) => void,
  onConversationsChanged: () => void,
): boolean {
  const [connected, setConnected] = useState(false);
  // The subscription outlives each render, so the handlers are read from refs
  // rather than captured — otherwise reconnecting on every new callback
  // identity would tear the socket down constantly.
  const messageHandler = useRef(onMessage);
  const listHandler = useRef(onConversationsChanged);

  // Assigned in an effect rather than during render: mutating a ref while
  // rendering is not safe under concurrent rendering.
  useEffect(() => {
    messageHandler.current = onMessage;
    listHandler.current = onConversationsChanged;
  }, [onMessage, onConversationsChanged]);

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
        client.subscribe(MESSAGES, (frame) => {
          try {
            messageHandler.current(JSON.parse(frame.body) as DirectMessage);
          } catch {
            // A frame we cannot parse is dropped rather than crashing the
            // subscription; the message is still on the server.
          }
        });
        client.subscribe(CONVERSATIONS, () => listHandler.current());
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
