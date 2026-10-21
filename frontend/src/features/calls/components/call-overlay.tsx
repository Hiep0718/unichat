/**
 * What a call looks like while it is happening.
 *
 * One component for every phase rather than a modal per phase: the same call
 * passes through ringing, connecting and talking without the panel ever
 * leaving the screen, and swapping components underneath the user would
 * restart the animation each time.
 *
 * The panel leads with who, not with what. A ringing phone that says only
 * "Cuộc gọi thoại đến" makes the person reach for the conversation list to
 * find out who is on the other end before deciding whether to answer.
 */
import { useEffect, useState } from 'react';

import { Icon } from '../../../components/icon';
import { useCall } from '../call-provider';
import { endReasonText } from '../call-machine';

import './call-overlay.css';

import type { CallPhase } from '../call-machine';

/** Phases where the panel is a card rather than a strip. */
const RINGING: ReadonlySet<CallPhase> = new Set<CallPhase>(['incoming', 'outgoing', 'connecting']);

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Seconds since media started flowing, ticking while it still is.
 *
 * Measured from the moment the peer connection came up rather than from when
 * the call was placed, so the number matches what the other side sees and
 * never counts the ringing.
 */
function useElapsed(since: number | null, running: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running || since === null) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running, since]);

  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}

export function CallOverlay() {
  const call = useCall();
  const state = call?.state;
  const elapsed = useElapsed(state?.connectedAt ?? null, state?.phase === 'active');

  if (!call || !state || state.phase === 'idle') return null;

  const { answer, decline, hangUp, toggleMute } = call;
  const { phase, peerName, muted, endReason } = state;
  const incoming = phase === 'incoming';
  const over = phase === 'ended';
  const name = peerName ?? 'Cuộc gọi thoại';

  const status = (() => {
    switch (phase) {
      case 'outgoing':
        return 'Đang gọi…';
      case 'incoming':
        return 'Cuộc gọi thoại đến';
      case 'connecting':
        return 'Đang kết nối…';
      case 'active':
        return formatDuration(elapsed);
      default:
        return elapsed > 0
          ? `${endReasonText(endReason)} · ${formatDuration(elapsed)}`
          : endReasonText(endReason);
    }
  })();

  return (
    <section
      className={`call-overlay call-overlay--${phase} ${RINGING.has(phase) ? 'call-overlay--card' : ''}`}
      role="dialog"
      aria-label="Cuộc gọi"
      aria-live="polite"
    >
      <div className="call-overlay__identity">
        <span className="call-overlay__avatar" aria-hidden="true">
          {over ? <Icon name="call_end" size={22} /> : name.trim().charAt(0).toUpperCase()}
        </span>
        <div className="call-overlay__text">
          <p className="call-overlay__name">{name}</p>
          <p
            className={`call-overlay__status ${phase === 'active' ? 'call-overlay__status--timer' : ''}`}
          >
            {status}
          </p>
          {call.error && <p className="call-overlay__error">{call.error}</p>}
        </div>
      </div>

      <div className="call-overlay__actions">
        {phase === 'active' && (
          <button
            type="button"
            className={`call-overlay__button call-overlay__button--icon ${muted ? 'call-overlay__button--on' : ''}`}
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Bật micro' : 'Tắt micro'}
          >
            <Icon name={muted ? 'mic_off' : 'mic'} size={20} />
          </button>
        )}

        {incoming && (
          <button
            type="button"
            className="call-overlay__button call-overlay__button--accept"
            onClick={() => void answer()}
          >
            <Icon name="call" size={20} />
            Nghe
          </button>
        )}

        {!over && (
          <button
            type="button"
            className="call-overlay__button call-overlay__button--end"
            onClick={() => void (incoming ? decline() : hangUp())}
          >
            <Icon name="call_end" size={20} />
            {incoming ? 'Từ chối' : 'Kết thúc'}
          </button>
        )}
      </div>
    </section>
  );
}
