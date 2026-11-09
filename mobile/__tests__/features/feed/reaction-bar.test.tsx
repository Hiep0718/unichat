import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ReactionBar, usedTypes } from '../../../src/features/feed/components/reaction-bar';
import { feedApi } from '../../../src/features/feed/feed-api';

jest.mock('../../../src/features/feed/feed-api', () => ({
  ...jest.requireActual('../../../src/features/feed/feed-api'),
  feedApi: { toggleReaction: jest.fn() },
}));
const mockShowToast = jest.fn();
jest.mock('../../../src/lib/toast-context', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const ID = '123e4567-e89b-12d3-a456-426614174000';
const NONE = { counts: {}, total: 0, myReaction: null };

describe('ReactionBar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('offers to react when the reader has not, and shows nobody else reacted', async () => {
    const screen = await render(<ReactionBar targetType="DISCUSSION" targetId={ID} summary={NONE} />);

    expect(screen.getByText('Thích')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows the reader’s own reaction and the tally', async () => {
    const summary = { counts: { LOVE: 2, LIKE: 1 }, total: 3, myReaction: 'LOVE' as const };
    const screen = await render(<ReactionBar targetType="DISCUSSION" targetId={ID} summary={summary} />);

    expect(screen.getByText('Yêu thích')).toBeTruthy();
    expect(screen.getByText('👍❤️')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('stores the picked reaction and reports the server’s new summary', async () => {
    const next = { counts: { HAHA: 1 }, total: 1, myReaction: 'HAHA' as const };
    jest.mocked(feedApi.toggleReaction).mockResolvedValue(next);
    const onChange = jest.fn();
    const screen = await render(<ReactionBar targetType="DISCUSSION_REPLY" targetId={ID} summary={NONE} onChange={onChange} />);

    await fireEvent.press(screen.getByTestId(`reaction-trigger-${ID}`));
    await fireEvent.press(screen.getByTestId('reaction-option-HAHA'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(next));
    expect(feedApi.toggleReaction).toHaveBeenCalledWith('DISCUSSION_REPLY', ID, 'HAHA');
    expect(screen.getByText('Haha')).toBeTruthy();
  });

  it('keeps the old state and tells the user when saving fails', async () => {
    jest.mocked(feedApi.toggleReaction).mockRejectedValue(new Error('down'));
    const onChange = jest.fn();
    const screen = await render(<ReactionBar targetType="DISCUSSION" targetId={ID} summary={NONE} onChange={onChange} />);

    await fireEvent.press(screen.getByTestId(`reaction-trigger-${ID}`));
    await fireEvent.press(screen.getByTestId('reaction-option-LIKE'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Thích')).toBeTruthy();
  });

  it('lists used reactions in the standard display order', () => {
    expect(usedTypes({ counts: { ANGRY: 1, LIKE: 4, WOW: 0 }, total: 5, myReaction: null })).toEqual(['LIKE', 'ANGRY']);
  });
});
