import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CallOverlay } from './call-overlay';
import { IDLE } from '../call-machine';

import type { CallState } from '../call-machine';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const answer = vi.fn();
const decline = vi.fn();
const hangUp = vi.fn();
const toggleMute = vi.fn();

let state: CallState = IDLE;
let error: string | null = null;

vi.mock('../call-provider', () => ({
  useCall: () => ({ state, error, answer, decline, hangUp, toggleMute, placeCall: vi.fn() }),
}));

function given(partial: Partial<CallState>) {
  state = { ...IDLE, callId: 'call-1', peerId: 'peer-1', ...partial };
  error = null;
}

describe('CallOverlay', () => {
  it('should show nothing at all when no call is happening', () => {
    given({ phase: 'idle', callId: null });
    const { container } = render(<CallOverlay />);

    expect(container).toBeEmptyDOMElement();
  });

  it('should offer answer and decline while being rung', async () => {
    const user = userEvent.setup();
    given({ phase: 'incoming' });
    render(<CallOverlay />);

    expect(screen.getByText('Cuộc gọi thoại đến')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Nghe/ }));
    expect(answer).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Từ chối/ }));
    expect(decline).toHaveBeenCalled();
  });

  it('should not offer to answer a call this side placed', () => {
    given({ phase: 'outgoing' });
    render(<CallOverlay />);

    expect(screen.getByText('Đang gọi…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nghe/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kết thúc/ })).toBeInTheDocument();
  });

  it('should only offer mute once media is flowing', () => {
    given({ phase: 'connecting' });
    const { unmount } = render(<CallOverlay />);
    // Muting a connection that has no track yet would do nothing visible.
    expect(screen.queryByRole('button', { name: /micro/i })).not.toBeInTheDocument();
    unmount();

    given({ phase: 'active' });
    render(<CallOverlay />);
    expect(screen.getByRole('button', { name: 'Tắt micro' })).toBeInTheDocument();
  });

  it('should say the microphone is off rather than only change the icon', () => {
    given({ phase: 'active', muted: true });
    render(<CallOverlay />);

    const button = screen.getByRole('button', { name: 'Bật micro' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('should explain why a call ended and stop offering to hang up', () => {
    given({ phase: 'ended', endReason: 'BUSY' });
    render(<CallOverlay />);

    expect(screen.getByText('Người này đang bận')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kết thúc/ })).not.toBeInTheDocument();
  });

  it('should surface the reason a call could not start', () => {
    given({ phase: 'ended', endReason: null });
    error = 'Trình duyệt chặn micro vì trang không chạy trên HTTPS.';
    render(<CallOverlay />);

    // The commonest cause is a LAN address rather than a missing device, and
    // without this the button simply appears to do nothing.
    expect(screen.getByText(/không chạy trên HTTPS/)).toBeInTheDocument();
  });
});
