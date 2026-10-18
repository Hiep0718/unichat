/**
 * What a call looks like while it is happening.
 *
 * One component for every phase rather than a modal per phase: the same call
 * passes through ringing, connecting and talking without the panel ever
 * leaving the screen, and swapping components underneath the user would
 * restart the animation each time.
 */
import { Icon } from '../../../components/icon';
import { useCall } from '../call-provider';
import { endReasonText } from '../call-machine';

import './call-overlay.css';

import type { CallEndReason } from '../call-api';
import type { CallPhase } from '../call-machine';

/** The line under the name, saying what is happening. */
function statusText(phase: CallPhase, endReason: CallEndReason | null): string {
  switch (phase) {
    case 'outgoing':
      return 'Đang gọi…';
    case 'incoming':
      return 'Cuộc gọi thoại đến';
    case 'connecting':
      return 'Đang kết nối…';
    case 'active':
      return 'Đang trong cuộc gọi';
    default:
      return endReasonText(endReason);
  }
}

export function CallOverlay() {
  const call = useCall();
  if (!call || call.state.phase === 'idle') return null;

  const { state, answer, decline, hangUp, toggleMute } = call;
  const incoming = state.phase === 'incoming';
  const over = state.phase === 'ended';

  return (
    <section
      className={`call-overlay call-overlay--${state.phase}`}
      role="dialog"
      aria-label="Cuộc gọi"
      aria-live="polite"
    >
      <div className="call-overlay__identity">
        <span className="call-overlay__avatar" aria-hidden="true">
          <Icon name={over ? 'call_end' : 'call'} size={22} />
        </span>
        <div>
          <p className="call-overlay__status">{statusText(state.phase, state.endReason)}</p>
          {call.error && <p className="call-overlay__error">{call.error}</p>}
        </div>
      </div>

      <div className="call-overlay__actions">
        {state.phase === 'active' && (
          <button
            type="button"
            className={`call-overlay__button ${state.muted ? 'call-overlay__button--on' : ''}`}
            onClick={toggleMute}
            aria-pressed={state.muted}
            aria-label={state.muted ? 'Bật micro' : 'Tắt micro'}
          >
            <Icon name={state.muted ? 'mic_off' : 'mic'} size={20} />
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
