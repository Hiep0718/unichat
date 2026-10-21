/**
 * The button that starts a call, in a conversation's header.
 *
 * Only for one-to-one threads: a group call needs a media server and is not
 * built, so offering the button there would promise something that fails.
 */
import { Icon } from '../../../components/icon';
import { isBusy } from '../call-machine';
import { useCall } from '../call-provider';

import './call-button.css';

interface CallButtonProps {
  readonly conversationId: string;
  /** The person being called, for the label a screen reader announces. */
  readonly peerName: string;
}

export function CallButton({ conversationId, peerName }: CallButtonProps) {
  const call = useCall();
  if (!call) return null;

  // Disabled rather than hidden while a call is up: a button that vanishes
  // leaves the reader wondering whether it was ever there.
  const busy = isBusy(call.state);

  return (
    <button
      type="button"
      className="call-button"
      onClick={() => void call.placeCall(conversationId, peerName)}
      disabled={busy}
      title={busy ? 'Bạn đang trong một cuộc gọi' : `Gọi thoại cho ${peerName}`}
      aria-label={`Gọi thoại cho ${peerName}`}
    >
      <Icon name="call" size={18} />
    </button>
  );
}
