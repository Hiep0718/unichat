import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComposeSuggestions } from './compose-suggestions';
import * as api from '../community-api';
import type { ComposeSuggestion } from '../community-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const suggestion = (overrides: Partial<ComposeSuggestion> = {}): ComposeSuggestion => ({
  similarPosts: [],
  documentCount: 3,
  ...overrides,
});

function mockSuggestions(result: ComposeSuggestion) {
  return vi.spyOn(api, 'fetchComposeSuggestions').mockResolvedValue(result);
}

describe('ComposeSuggestions', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should offer a matching post so the question is not asked twice', async () => {
    // Arrange
    mockSuggestions(
      suggestion({
        similarPosts: [
          {
            id: 'p1',
            title: 'Cách tạo chỉ mục trong PostgreSQL',
            replyCount: 4,
            resolved: true,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    );

    // Act
    render(
      <ComposeSuggestions workspaceId="w1" draft="tạo chỉ mục" onOpenPost={() => {}} />,
    );

    // Assert
    expect(
      await screen.findByText('Cách tạo chỉ mục trong PostgreSQL'),
    ).toBeInTheDocument();
    expect(screen.getByText('Đã có lời giải')).toBeInTheDocument();
  });

  it('should open the existing post rather than making the author write a new one', async () => {
    // Arrange
    const onOpenPost = vi.fn();
    mockSuggestions(
      suggestion({
        similarPosts: [
          {
            id: 'p1',
            title: 'Chỉ mục B-Tree',
            replyCount: 2,
            resolved: false,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    );
    render(
      <ComposeSuggestions workspaceId="w1" draft="chỉ mục" onOpenPost={onOpenPost} />,
    );

    // Act
    await userEvent.click(await screen.findByRole('button'));

    // Assert
    expect(onOpenPost).toHaveBeenCalledWith('p1');
  });

  it('should say the assistant has documents it can answer from', async () => {
    // Arrange and Act
    mockSuggestions(suggestion({ documentCount: 7 }));
    render(<ComposeSuggestions workspaceId="w1" draft="chỉ mục" onOpenPost={() => {}} />);

    // Assert
    expect(await screen.findByText(/Nhóm có 7 tài liệu/)).toBeInTheDocument();
  });

  it('should warn that an empty library leaves the assistant nothing to answer from', async () => {
    // Arrange and Act
    mockSuggestions(suggestion({ documentCount: 0 }));
    render(<ComposeSuggestions workspaceId="w1" draft="chỉ mục" onOpenPost={() => {}} />);

    // Assert
    expect(await screen.findByText(/chưa có tài liệu nào được duyệt/)).toBeInTheDocument();
  });

  it('should stay silent when nothing matches, rather than showing an empty box', async () => {
    // Arrange and Act
    mockSuggestions(suggestion({ similarPosts: [], documentCount: 2 }));
    render(<ComposeSuggestions workspaceId="w1" draft="chỉ mục" onOpenPost={() => {}} />);

    // Assert
    await screen.findByText(/Nhóm có 2 tài liệu/);
    expect(screen.queryByText(/bài tương tự/)).not.toBeInTheDocument();
  });

  it('should never block posting when the lookup fails', async () => {
    // Arrange: a suggestion is an aid, not a requirement.
    vi.spyOn(api, 'fetchComposeSuggestions').mockRejectedValue(new Error('offline'));

    // Act
    const { container } = render(
      <ComposeSuggestions workspaceId="w1" draft="chỉ mục" onOpenPost={() => {}} />,
    );

    // Assert
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('should debounce typing into a single lookup', async () => {
    // Arrange
    const spy = mockSuggestions(suggestion());
    const { rerender } = render(
      <ComposeSuggestions workspaceId="w1" draft="chỉ" onOpenPost={() => {}} />,
    );

    // Act: three keystrokes in quick succession.
    rerender(<ComposeSuggestions workspaceId="w1" draft="chỉ m" onOpenPost={() => {}} />);
    rerender(<ComposeSuggestions workspaceId="w1" draft="chỉ mục" onOpenPost={() => {}} />);

    // Assert: only the settled draft is looked up.
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith('w1', 'chỉ mục');
  });
});
