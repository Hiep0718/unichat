/**
 * The socket side of a call.
 *
 * Two destinations, both scoped to this user by Spring: the lifecycle of a
 * call, and the frames that negotiate it. They are separate because they are
 * read by different things — the lifecycle drives what is on screen, the
 * signalling drives the peer connection — and mixing them would make every
 * listener filter the other's traffic.
 */
import type { CallEvent } from './call-machine';
import type { StompConnection } from '../../lib/stomp-connection';

export const CALL_EVENTS = '/user/queue/calls';
export const CALL_SIGNALS = '/user/queue/calls/signal';

/** What a signalling frame is for. */
export type SignalKind = 'OFFER' | 'ANSWER' | 'ICE';

export interface RelayedSignal {
  readonly callId: string;
  readonly kind: SignalKind;
  readonly payload: string;
}

/**
 * Parses a frame, returning null for anything unrecognisable.
 *
 * A frame this build does not understand is dropped rather than thrown on.
 * The socket is shared with Work Chat, and a parse error here must not take
 * down a subscription that messages also depend on.
 */
function parse<T>(body: string): T | null {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/** Listens for lifecycle changes. Returns the unsubscribe function. */
export function onCallEvents(
  connection: StompConnection,
  handler: (event: CallEvent) => void,
): () => void {
  return connection.subscribe(CALL_EVENTS, (body) => {
    const event = parse<CallEvent>(body);
    if (event) handler(event);
  });
}

/** Listens for relayed WebRTC frames. Returns the unsubscribe function. */
export function onCallSignals(
  connection: StompConnection,
  handler: (signal: RelayedSignal) => void,
): () => void {
  return connection.subscribe(CALL_SIGNALS, (body) => {
    const signal = parse<RelayedSignal>(body);
    if (signal) handler(signal);
  });
}

/**
 * Sends one frame to the other party.
 *
 * Returns whether it went. A dropped frame is survivable — ICE retries, and a
 * lost offer ends the call as a failed connection rather than a hang — but
 * the caller is told so it can stop pretending the call is progressing.
 */
export function sendSignal(
  connection: StompConnection,
  callId: string,
  kind: SignalKind,
  payload: string,
): boolean {
  return connection.publish(`/app/calls/${callId}/signal`, { kind, payload });
}
