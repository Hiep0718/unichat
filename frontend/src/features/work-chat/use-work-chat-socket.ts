/**
 * Live delivery of Work Chat messages.
 *
 * The socket is a convenience, not the source of truth: every message is
 * already stored before it is pushed, so a page that fails to connect still
 * shows everything on its next load. Nothing here blocks sending.
 *
 * Two destinations, both scoped to the connected user: messages, and a nudge
 * that the conversation list changed. The second exists because being added to
 * a group sends no message, so without it the group would not appear until the
 * page was reloaded.
 *
 * The connection itself belongs to the application rather than to this screen
 * — see `RealtimeProvider`. This hook only says what Work Chat listens to.
 */
import { useCallback } from 'react';

import { useRealtimeStatus, useRealtimeSubscription } from '../realtime/realtime-provider';

import type { DirectMessage } from './work-chat-api';

/** Spring scopes these destinations to the connected principal. */
const MESSAGES = '/user/queue/messages';
const CONVERSATIONS = '/user/queue/conversations';

/**
 * Subscribes to the caller's queues for as long as the component lives.
 *
 * @param onMessage called for each message the server pushes
 * @param onConversationsChanged called with the conversation that changed
 *        without a message arriving — added to a group, removed, renamed, or
 *        its picture replaced
 * @returns whether the connection is currently up, for an unobtrusive indicator
 */
export function useWorkChatSocket(
  onMessage: (message: DirectMessage) => void,
  onConversationsChanged: (conversationId: string) => void,
): boolean {
  const handleMessage = useCallback(
    (body: string) => {
      try {
        onMessage(JSON.parse(body) as DirectMessage);
      } catch {
        // A frame we cannot parse is dropped rather than crashing the
        // subscription; the message is still on the server.
      }
    },
    [onMessage],
  );

  useRealtimeSubscription(MESSAGES, handleMessage);
  useRealtimeSubscription(CONVERSATIONS, onConversationsChanged);

  return useRealtimeStatus();
}
