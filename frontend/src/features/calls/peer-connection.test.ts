// @vitest-environment node
//
// jsdom has no RTCPeerConnection and no getUserMedia, so both are stubbed.
// What is being tested is the ordering this wrapper exists to handle, not the
// browser's WebRTC implementation.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CallPeer } from './peer-connection';

import type { SignalKind } from './call-signalling';

interface FakeConnection {
  remoteDescription: unknown;
  connectionState: string;
  onicecandidate: ((event: { candidate: { toJSON: () => object } | null }) => void) | null;
  ontrack: ((event: { streams: MediaStream[] }) => void) | null;
  onconnectionstatechange: (() => void) | null;
  addedCandidates: unknown[];
  addedTracks: unknown[];
  closed: boolean;
}

let connection: FakeConnection;
const stoppedTracks: string[] = [];

function fakeTrack(id: string) {
  return { id, enabled: true, stop: () => stoppedTracks.push(id) };
}

const microphone = {
  getTracks: () => [fakeTrack('mic')],
  getAudioTracks: () => [fakeTrack('mic')],
};

beforeEach(() => {
  stoppedTracks.length = 0;
  connection = {
    remoteDescription: null,
    connectionState: 'new',
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    addedCandidates: [],
    addedTracks: [],
    closed: false,
  };

  vi.stubGlobal('RTCPeerConnection', function FakeRtc(this: unknown) {
    Object.assign(connection, {
      createOffer: () => Promise.resolve({ type: 'offer', sdp: 'offer-sdp' }),
      createAnswer: () => Promise.resolve({ type: 'answer', sdp: 'answer-sdp' }),
      setLocalDescription: () => Promise.resolve(),
      setRemoteDescription: (description: unknown) => {
        connection.remoteDescription = description;
        return Promise.resolve();
      },
      addIceCandidate: (candidate: unknown) => {
        connection.addedCandidates.push(candidate);
        return Promise.resolve();
      },
      addTrack: (track: unknown) => connection.addedTracks.push(track),
      close: () => {
        connection.closed = true;
      },
    });
    return connection;
  });

  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia: () => Promise.resolve(microphone) },
  });
});

afterEach(() => vi.unstubAllGlobals());

function build(sent: { kind: SignalKind; payload: string }[] = []) {
  return new CallPeer(
    { iceServers: [] },
    (kind, payload) => sent.push({ kind, payload }),
    { onConnected: vi.fn(), onFailed: vi.fn(), onRemoteStream: vi.fn() },
  );
}

describe('CallPeer', () => {
  it('should hold candidates that arrive before the description they belong to', async () => {
    const peer = build();

    // The caller gathers the moment it has a local offer, so its candidates
    // reach the callee before the callee has set any remote description.
    await peer.addCandidate(JSON.stringify({ candidate: 'early-1' }));
    await peer.addCandidate(JSON.stringify({ candidate: 'early-2' }));
    expect(connection.addedCandidates).toHaveLength(0);

    await peer.answer(JSON.stringify({ type: 'offer', sdp: 'remote' }));

    // Dropping them would cost two network paths the two sides never try, and
    // on a restrictive network one of them may have been the only one.
    expect(connection.addedCandidates).toHaveLength(2);
  });

  it('should add a candidate straight away once a description is set', async () => {
    const peer = build();
    await peer.answer(JSON.stringify({ type: 'offer', sdp: 'remote' }));

    await peer.addCandidate(JSON.stringify({ candidate: 'late' }));

    expect(connection.addedCandidates).toHaveLength(1);
  });

  it('should send an offer after opening the microphone', async () => {
    const sent: { kind: SignalKind; payload: string }[] = [];
    const peer = build(sent);

    await peer.offer();

    expect(connection.addedTracks).toHaveLength(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.kind).toBe('OFFER');
  });

  it('should answer with the description the other side sent', async () => {
    const sent: { kind: SignalKind; payload: string }[] = [];
    const peer = build(sent);

    await peer.answer(JSON.stringify({ type: 'offer', sdp: 'remote-sdp' }));

    expect(connection.remoteDescription).toEqual({ type: 'offer', sdp: 'remote-sdp' });
    expect(sent.map((frame) => frame.kind)).toEqual(['ANSWER']);
  });

  it('should disable the track rather than remove it when muting', async () => {
    const peer = build();
    await peer.offer();

    peer.setMuted(true);

    // Removing a track renegotiates the connection, so the other side would
    // hear the call glitch every time somebody muted.
    expect(connection.addedTracks).toHaveLength(1);
    expect(stoppedTracks).toEqual([]);
  });

  it('should stop the microphone when the call is closed', async () => {
    const peer = build();
    await peer.offer();

    peer.close();

    // Without this the browser's recording indicator stays on after the call,
    // which looks exactly like being listened to.
    expect(stoppedTracks).toEqual(['mic']);
    expect(connection.closed).toBe(true);
  });

  it('should not send candidates after it has been closed', async () => {
    const sent: { kind: SignalKind; payload: string }[] = [];
    const peer = build(sent);
    await peer.offer();
    const emit = connection.onicecandidate;

    peer.close();
    emit?.({ candidate: { toJSON: () => ({ candidate: 'trickle' }) } });

    expect(sent.filter((frame) => frame.kind === 'ICE')).toHaveLength(0);
  });

  it('should tolerate being closed twice', async () => {
    const peer = build();
    await peer.offer();

    peer.close();
    peer.close();

    // Teardown runs from both the hang-up path and the unmount path, and they
    // can both happen.
    expect(stoppedTracks).toEqual(['mic']);
  });
});
