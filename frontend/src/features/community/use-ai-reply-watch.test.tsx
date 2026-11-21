import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiReplyWatch } from './use-ai-reply-watch';
import * as communityApi from './community-api';

import type { ReplyResponse } from './community-api';

vi.mock('./community-api', () => ({
  fetchReplies: vi.fn(),
}));

const answer = {
  id: 'ai-1',
  parentReplyId: 'trigger',
  isAiAnswer: true,
} as ReplyResponse;

describe('useAiReplyWatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('delivers the answer under StrictMode instead of stopping after the first check', async () => {
    // Arrange: StrictMode rehearses an unmount and remount on the same refs;
    // that rehearsal must not end the wait.
    vi.mocked(communityApi.fetchReplies).mockResolvedValueOnce([]).mockResolvedValueOnce([answer]);
    const onAnswer = vi.fn();
    const { result } = renderHook(() => useAiReplyWatch('ws', 'post', onAnswer), { reactStrictMode: true });

    // Act
    act(() => result.current.watch('trigger'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    // Assert
    expect(onAnswer).toHaveBeenCalledWith(answer);
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('stops polling once the component is really unmounted', async () => {
    // Arrange
    const { result, unmount } = renderHook(() => useAiReplyWatch('ws', 'post', vi.fn()));
    act(() => result.current.watch('trigger'));

    // Act
    unmount();
    await vi.advanceTimersByTimeAsync(4000);

    // Assert
    expect(communityApi.fetchReplies).not.toHaveBeenCalled();
  });

  it('tells the reader when checking for the answer failed', async () => {
    // Arrange
    vi.mocked(communityApi.fetchReplies).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useAiReplyWatch('ws', 'post', vi.fn()));

    // Act
    act(() => result.current.watch('trigger'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // Assert
    expect(result.current.error).toBe('Không kiểm tra được câu trả lời của trợ lý.');
    expect(result.current.pending).toBe(false);
  });
});
