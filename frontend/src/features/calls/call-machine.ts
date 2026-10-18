/**
 * What a call looks like from one browser, and what each event does to it.
 *
 * A pure reducer on purpose. Everything else in this feature touches
 * `RTCPeerConnection`, `getUserMedia` or a socket, none of which exist in
 * jsdom — so if the rules lived alongside them they could only be tested by
 * mocking the browser. Here they are tested by calling a function.
 */
import type { CallEndReason, CallMedia, CallStatus } from './call-api';

export type CallPhase =
  /** Nothing happening. */
  | 'idle'
  /** We placed a call and it is ringing. */
  | 'outgoing'
  /** Somebody is ringing us. */
  | 'incoming'
  /** Answered; the peer connection is being negotiated. */
  | 'connecting'
  /** Media is flowing. */
  | 'active'
  /** Over, and showing why for a moment before it clears. */
  | 'ended';

export interface CallState {
  readonly phase: CallPhase;
  readonly callId: string | null;
  readonly conversationId: string | null;
  /** The other person. Null only while idle. */
  readonly peerId: string | null;
  readonly media: CallMedia;
  /** Set once the call is over, for the line the user reads. */
  readonly endReason: CallEndReason | null;
  /** Whether this side's microphone is off. */
  readonly muted: boolean;
}

export const IDLE: CallState = {
  phase: 'idle',
  callId: null,
  conversationId: null,
  peerId: null,
  media: 'AUDIO',
  endReason: null,
  muted: false,
};

/** A lifecycle frame from `/user/queue/calls`. */
export interface CallEvent {
  readonly callId: string;
  readonly conversationId: string;
  readonly peerId: string;
  readonly incoming: boolean;
  readonly media: CallMedia;
  readonly status: CallStatus;
  readonly endReason: CallEndReason | null;
}

export type CallAction =
  /** We pressed call and the server accepted it. */
  | { readonly type: 'placed'; readonly event: CallEvent }
  /** A lifecycle frame arrived. */
  | { readonly type: 'server'; readonly event: CallEvent }
  /** We pressed answer. */
  | { readonly type: 'answered' }
  /** The peer connection reported it is up. */
  | { readonly type: 'connected' }
  /** Mute toggled. */
  | { readonly type: 'muted'; readonly muted: boolean }
  /** The ended banner was dismissed, or enough time passed. */
  | { readonly type: 'cleared' };

/** Statuses that mean the call is over, whatever the reason. */
const TERMINAL: ReadonlySet<CallStatus> = new Set<CallStatus>([
  'ENDED',
  'DECLINED',
  'MISSED',
  'FAILED',
]);

function fromEvent(event: CallEvent, phase: CallPhase): CallState {
  return {
    phase,
    callId: event.callId,
    conversationId: event.conversationId,
    peerId: event.peerId,
    media: event.media,
    endReason: event.endReason,
    muted: false,
  };
}

/**
 * Applies one action.
 *
 * Frames about a call we are not on are ignored rather than allowed to
 * replace the current one. The socket delivers what the server decided to
 * send; a late frame from a call that already ended must not tear down the
 * call that started after it.
 */
export function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case 'placed':
      return fromEvent(action.event, action.event.status === 'RINGING' ? 'outgoing' : 'ended');

    case 'server':
      return applyServerEvent(state, action.event);

    case 'answered':
      return state.phase === 'incoming' ? { ...state, phase: 'connecting' } : state;

    case 'connected':
      // Only from connecting: a late "connected" from a torn-down peer
      // connection must not revive a call that has ended.
      return state.phase === 'connecting' ? { ...state, phase: 'active' } : state;

    case 'muted':
      return { ...state, muted: action.muted };

    case 'cleared':
      return state.phase === 'ended' ? IDLE : state;

    default:
      return state;
  }
}

function applyServerEvent(state: CallState, event: CallEvent): CallState {
  if (event.status === 'RINGING' && event.incoming) {
    // Being rung while already on a call cannot normally happen — the server
    // answers the second caller with BUSY — but a frame that slipped through
    // must not replace a call in progress.
    return state.phase === 'idle' ? fromEvent(event, 'incoming') : state;
  }

  if (state.callId !== event.callId) return state;

  if (TERMINAL.has(event.status)) {
    return { ...fromEvent(event, 'ended'), muted: state.muted };
  }

  if (event.status === 'ACTIVE' && state.phase === 'outgoing') {
    // The callee picked up. Media is not flowing yet; that is 'connected'.
    return { ...state, phase: 'connecting' };
  }

  return state;
}

/** Whether a call is on screen in any form. */
export function isBusy(state: CallState): boolean {
  return state.phase !== 'idle' && state.phase !== 'ended';
}

/** What to tell the user about a call that just ended. */
export function endReasonText(reason: CallEndReason | null): string {
  switch (reason) {
    case 'DECLINED':
      return 'Cuộc gọi bị từ chối';
    case 'NO_ANSWER':
      return 'Không có ai trả lời';
    case 'OFFLINE':
      return 'Người này đang ngoại tuyến';
    case 'BUSY':
      return 'Người này đang bận';
    case 'CONNECTION_FAILED':
      return 'Không kết nối được';
    case 'HUNG_UP':
      return 'Cuộc gọi đã kết thúc';
    default:
      return 'Cuộc gọi đã kết thúc';
  }
}
