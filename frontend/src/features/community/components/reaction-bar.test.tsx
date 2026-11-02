import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReactionBar } from './reaction-bar';

import type { ReactionSummary } from '../community-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

vi.mock('../community-api', () => ({
  toggleReaction: vi.fn(),
}));

const EMPTY: ReactionSummary = { counts: {}, total: 0, myReaction: null };

function renderBar(summary: ReactionSummary = EMPTY) {
  return render(
    <ReactionBar targetType="DISCUSSION" targetId="post-1" summary={summary} />,
  );
}

describe('ReactionBar', () => {
  it('should offer the seven reactions in Facebook order', async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByRole('button', { name: /Bày tỏ cảm xúc/ }));

    // Position is how someone who has used Facebook picks one, so the order
    // is part of the behaviour, not just presentation.
    const options = screen.getAllByRole('menuitem');
    expect(options.map((option) => option.textContent)).toEqual([
      '👍Thích',
      '❤️Yêu thích',
      '🥰Thương thương',
      '😆Haha',
      '😮Wow',
      '😢Buồn',
      '😠Phẫn nộ',
    ]);
  });

  it('should show the reader their own reaction on the trigger', () => {
    renderBar({ counts: { ANGRY: 1 }, total: 1, myReaction: 'ANGRY' });

    expect(screen.getByRole('button', { name: /Phẫn nộ/ })).toBeInTheDocument();
  });

  it('should tally only the reactions people actually left', () => {
    renderBar({ counts: { LIKE: 2, WOW: 1 }, total: 3, myReaction: null });

    expect(screen.getByTitle('Thích: 2 · Wow: 1')).toBeInTheDocument();
  });

  it('should send the chosen reaction to the server', async () => {
    const user = userEvent.setup();
    const { toggleReaction } = await import('../community-api');
    vi.mocked(toggleReaction).mockResolvedValue({
      counts: { HAHA: 1 },
      total: 1,
      myReaction: 'HAHA',
    });
    renderBar();

    await user.click(screen.getByRole('button', { name: /Bày tỏ cảm xúc/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Haha' }));

    expect(toggleReaction).toHaveBeenCalledWith({
      targetType: 'DISCUSSION',
      targetId: 'post-1',
      reactionType: 'HAHA',
    });
  });
});
