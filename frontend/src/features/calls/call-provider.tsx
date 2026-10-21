/* eslint-disable react-refresh/only-export-components */
/**
 * Holds the one call this browser can be on, wherever the user has navigated.
 *
 * Above the routes for the same reason the socket is: a call that only exists
 * while the chat screen is open is not a call. The provider owns the peer
 * connection, the signalling subscriptions and the element the other side's
 * audio plays through.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { useRealtime } from '../realtime/realtime-provider';
import { acceptCall, declineCall, endCall, getIceServers, reportCallFailed, startCall, toRtcIceServers } from './call-api';
import { callReducer, IDLE, isBusy } from './call-machine';
import { onCallEvents, onCallSignals, sendSignal } from './call-signalling';
import { CallPeer } from './peer-connection';

import type { ReactNode } from 'react';
import type { CallState } from './call-machine';
import type { RelayedSignal, SignalKind } from './call-signalling';

interface CallContextValue {
  readonly state: CallState;
  /** Why the last attempt could not start, for a message the user reads. */
  readonly error: string | null;
  /** `peerName` labels the panel; incoming calls get it from the server. */
  readonly placeCall: (conversationId: string, peerName: string) => Promise<void>;
  readonly answer: () => Promise<void>;
  readonly decline: () => Promise<void>;
  readonly hangUp: () => Promise<void>;
  readonly toggleMute: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

/** How long the reason for an ended call stays on screen. */
const ENDED_NOTICE_MS = 4000;

/**
 * Shown when the page cannot reach a microphone at all.
 *
 * Almost always the secure-context rule rather than a missing device:
 * `getUserMedia` is absent on plain HTTP except on localhost, which is
 * exactly what happens when this is opened over a LAN address for testing.
 */
const NO_MICROPHONE = 'Trình duyệt chặn micro vì trang không chạy trên HTTPS.';

/** Whether this page may open a microphone at all. */
function microphoneAvailable(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function CallProvider({ children }: { readonly children: ReactNode }) {
  const connection = useRealtime();
  const [state, dispatch] = useReducer(callReducer, IDLE);

  const peer = useRef<CallPeer | null>(null);
  /** Frames that arrived before there was a peer to give them to. */
  const buffered = useRef<RelayedSignal[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  // State, not a ref: a message held in a ref never reaches the screen,
  // because nothing re-renders when it changes.
  const [error, setError] = useState<string | null>(null);
  /** Read inside callbacks that must not re-subscribe when the call changes. */
  const current = useRef(state);
  useEffect(() => {
    current.current = state;
  }, [state]);

  const teardown = useCallback(() => {
    peer.current?.close();
    peer.current = null;
    buffered.current = [];
    if (audio.current) audio.current.srcObject = null;
  }, []);

  const buildPeer = useCallback(async (callId: string): Promise<CallPeer> => {
    const iceServers = toRtcIceServers(await getIceServers());
    const send = (kind: SignalKind, payload: string) => {
      if (connection) sendSignal(connection, callId, kind, payload);
    };

    return new CallPeer({ iceServers }, send, {
      onConnected: () => dispatch({ type: 'connected' }),
      onFailed: () => {
        // Only this browser knows the media never came up, so it has to say so.
        void reportCallFailed(callId).catch(() => undefined);
      },
      onRemoteStream: (stream) => {
        if (audio.current) {
          audio.current.srcObject = stream;
          void audio.current.play().catch(() => undefined);
        }
      },
    });
  }, [connection]);

  const applySignal = useCallback(async (signal: RelayedSignal) => {
    const active = peer.current;
    if (!active) {
      // The callee has no peer until they answer: building one on the offer
      // would open the microphone while the phone is still ringing.
      buffered.current.push(signal);
      return;
    }
    if (signal.kind === 'ANSWER') await active.acceptAnswer(signal.payload);
    if (signal.kind === 'ICE') await active.addCandidate(signal.payload);
  }, []);

  // Lifecycle frames. Subscribed once for the session, not per call.
  useEffect(() => {
    if (!connection) return;
    return onCallEvents(connection, (event) => {
      dispatch({ type: 'server', event });
      const terminal = event.status !== 'RINGING' && event.status !== 'ACTIVE';
      if (terminal && event.callId === current.current.callId) teardown();
    });
  }, [connection, teardown]);

  useEffect(() => {
    if (!connection) return;
    return onCallSignals(connection, (signal) => {
      void applySignal(signal);
    });
  }, [connection, applySignal]);

  // A call outlives a route change but not the tab, so release the microphone
  // if this unmounts for any reason.
  useEffect(() => teardown, [teardown]);

  // The panel says why the call ended, then goes away on its own. Waiting for
  // a dismissal would leave "Người này đang bận" on screen until noticed, and
  // block the next call, since a visible call is a busy one.
  useEffect(() => {
    if (state.phase !== 'ended') return;
    const timer = window.setTimeout(() => dispatch({ type: 'cleared' }), ENDED_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.callId]);

  const placeCall = useCallback(async (conversationId: string, peerName: string) => {
    if (isBusy(current.current)) return;
    if (!microphoneAvailable()) {
      setError(NO_MICROPHONE);
      return;
    }
    setError(null);

    const call = await startCall(conversationId, 'AUDIO');
    dispatch({
      type: 'placed',
      event: {
        callId: call.id,
        conversationId: call.conversationId,
        peerId: call.calleeId,
        peerName,
        incoming: false,
        media: call.media,
        status: call.status,
        endReason: call.endReason,
      },
    });

    // Offline or busy comes back already finished; there is nothing to negotiate.
    if (call.status !== 'RINGING') return;

    peer.current = await buildPeer(call.id);
    await peer.current.offer();
  }, [buildPeer]);

  const answer = useCallback(async () => {
    const { callId } = current.current;
    if (!callId || current.current.phase !== 'incoming') return;
    if (!microphoneAvailable()) {
      setError(NO_MICROPHONE);
      return;
    }
    setError(null);

    await acceptCall(callId);
    dispatch({ type: 'answered' });

    const created = await buildPeer(callId);
    peer.current = created;

    // The offer arrived while it was ringing; everything after it is ICE.
    const offer = buffered.current.find((signal) => signal.kind === 'OFFER');
    const rest = buffered.current.filter((signal) => signal.kind === 'ICE');
    buffered.current = [];

    if (offer) await created.answer(offer.payload);
    for (const candidate of rest) await created.addCandidate(candidate.payload);
  }, [buildPeer]);

  const decline = useCallback(async () => {
    const { callId } = current.current;
    teardown();
    if (callId) await declineCall(callId);
  }, [teardown]);

  const hangUp = useCallback(async () => {
    const { callId } = current.current;
    teardown();
    if (callId) await endCall(callId);
  }, [teardown]);

  const toggleMute = useCallback(() => {
    const muted = !current.current.muted;
    peer.current?.setMuted(muted);
    dispatch({ type: 'muted', muted });
  }, []);

  const value = useMemo<CallContextValue>(
    () => ({ state, error, placeCall, answer, decline, hangUp, toggleMute }),
    [state, error, placeCall, answer, decline, hangUp, toggleMute],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* The other side's audio. Rendered always so the element exists before
          a stream arrives, and hidden because there is nothing to look at. */}
      <audio ref={audio} autoPlay hidden />
    </CallContext.Provider>
  );
}

/** The current call, or null outside the provider. */
export function useCall(): CallContextValue | null {
  return useContext(CallContext);
}
