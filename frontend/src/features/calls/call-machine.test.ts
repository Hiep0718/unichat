// @vitest-environment node
//
// A pure reducer, so no DOM is needed. This is the whole reason the rules
// were kept out of the component that owns the peer connection.
import { describe, expect, it } from 'vitest';

import { callReducer, endReasonText, IDLE, isBusy } from './call-machine';

import type { CallEvent, CallState } from './call-machine';

const RINGING_IN: CallEvent = {
  callId: 'call-1',
  conversationId: 'conv-1',
  peerId: 'peer-1',
  peerName: 'Trần Bình',
  incoming: true,
  media: 'AUDIO',
  status: 'RINGING',
  endReason: null,
};

const RINGING_OUT: CallEvent = { ...RINGING_IN, incoming: false };

function given(...events: CallEvent[]): CallState {
  return events.reduce((state, event) => callReducer(state, { type: 'server', event }), IDLE);
}

describe('callReducer', () => {
  it('should ring when somebody calls while nothing is happening', () => {
    const state = given(RINGING_IN);

    expect(state.phase).toBe('incoming');
    expect(state.callId).toBe('call-1');
    expect(state.peerId).toBe('peer-1');
  });

  it('should not let a second incoming call replace one in progress', () => {
    const busy = given(RINGING_IN);
    const answered = callReducer(busy, { type: 'answered' });

    const intruder = callReducer(answered, {
      type: 'server',
      event: { ...RINGING_IN, callId: 'call-2', peerId: 'peer-2' },
    });

    // The server answers a second caller with BUSY, but a frame that slipped
    // through must not drop the call the user is already on.
    expect(intruder.callId).toBe('call-1');
    expect(intruder.phase).toBe('connecting');
  });

  it('should ignore frames about a call this browser is not on', () => {
    const ours = given(RINGING_IN);

    const stale = callReducer(ours, {
      type: 'server',
      event: { ...RINGING_IN, callId: 'old-call', status: 'ENDED', endReason: 'HUNG_UP' },
    });

    // A late frame from a call that already ended must not tear down the one
    // that started after it.
    expect(stale.phase).toBe('incoming');
    expect(stale.callId).toBe('call-1');
  });

  it('should move the caller to connecting when the callee picks up', () => {
    const placed = callReducer(IDLE, { type: 'placed', event: RINGING_OUT });
    expect(placed.phase).toBe('outgoing');

    const answered = callReducer(placed, {
      type: 'server',
      event: { ...RINGING_OUT, status: 'ACTIVE' },
    });

    // Picked up is not yet connected: the media still has to negotiate.
    expect(answered.phase).toBe('connecting');
  });

  it('should reach active only from connecting', () => {
    const placed = callReducer(IDLE, { type: 'placed', event: RINGING_OUT });

    // A stray 'connected' while still ringing would show a call in progress
    // that nobody had answered.
    expect(callReducer(placed, { type: 'connected' }).phase).toBe('outgoing');

    const connecting = callReducer(placed, {
      type: 'server',
      event: { ...RINGING_OUT, status: 'ACTIVE' },
    });
    expect(callReducer(connecting, { type: 'connected' }).phase).toBe('active');
  });

  it('should land on ended straight away when nobody could be rung', () => {
    const placed = callReducer(IDLE, {
      type: 'placed',
      event: { ...RINGING_OUT, status: 'MISSED', endReason: 'OFFLINE' },
    });

    // The server records the attempt and returns it already finished, so there
    // is nothing to negotiate and nothing to wait for.
    expect(placed.phase).toBe('ended');
    expect(placed.endReason).toBe('OFFLINE');
  });

  it('should end on every terminal status', () => {
    const terminal = ['ENDED', 'DECLINED', 'MISSED', 'FAILED'] as const;

    terminal.forEach((status) => {
      const state = callReducer(given(RINGING_IN), {
        type: 'server',
        event: { ...RINGING_IN, status, endReason: 'HUNG_UP' },
      });
      expect(state.phase).toBe('ended');
    });
  });

  it('should return to idle only once the call has ended', () => {
    const ringing = given(RINGING_IN);
    expect(callReducer(ringing, { type: 'cleared' }).phase).toBe('incoming');

    const ended = callReducer(ringing, {
      type: 'server',
      event: { ...RINGING_IN, status: 'DECLINED', endReason: 'DECLINED' },
    });
    expect(callReducer(ended, { type: 'cleared' })).toEqual(IDLE);
  });

  it('should keep the mute setting while the call is live', () => {
    const connecting = callReducer(given(RINGING_IN), { type: 'answered' });
    const muted = callReducer(connecting, { type: 'muted', muted: true });

    expect(muted.muted).toBe(true);
    expect(callReducer(muted, { type: 'connected' }).muted).toBe(true);
  });

  it('should only answer a call that is actually ringing', () => {
    // Nothing to answer, so the action must not invent a call.
    expect(callReducer(IDLE, { type: 'answered' })).toEqual(IDLE);
  });
});

describe('isBusy', () => {
  it('should count a ringing or live call as busy but not an ended one', () => {
    expect(isBusy(IDLE)).toBe(false);
    expect(isBusy(given(RINGING_IN))).toBe(true);

    const ended = callReducer(given(RINGING_IN), {
      type: 'server',
      event: { ...RINGING_IN, status: 'ENDED', endReason: 'HUNG_UP' },
    });
    // The panel is still on screen explaining why, but the line is free.
    expect(isBusy(ended)).toBe(false);
  });
});

describe('endReasonText', () => {
  it('should explain each outcome in Vietnamese', () => {
    expect(endReasonText('BUSY')).toBe('Người này đang bận');
    expect(endReasonText('OFFLINE')).toBe('Người này đang ngoại tuyến');
    expect(endReasonText('NO_ANSWER')).toBe('Không có ai trả lời');
    expect(endReasonText('CONNECTION_FAILED')).toBe('Không kết nối được');
  });

  it('should fall back rather than show nothing for an unknown reason', () => {
    expect(endReasonText(null)).toBe('Cuộc gọi đã kết thúc');
  });
});
