import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';

import FeedTabScreen from '../../../app/(tabs)/feed';
import { feedApi } from '../../../src/features/feed/feed-api';

import type { FeedPost } from '../../../src/features/feed/feed-types';

jest.mock('../../../src/features/feed/feed-api', () => ({
  ...jest.requireActual('../../../src/features/feed/feed-api'),
  feedApi: { fetchFeed: jest.fn(), fetchStats: jest.fn(), toggleBookmark: jest.fn(), toggleReaction: jest.fn() },
}));
jest.mock('../../../src/features/auth/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
const mockShowToast = jest.fn();
jest.mock('../../../src/lib/toast-context', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const api = jest.mocked(feedApi);
const POST: FeedPost = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  workspaceId: '223e4567-e89b-12d3-a456-426614174000',
  workspaceName: 'Khoa CNTT',
  authorId: 'u1',
  authorName: 'Lan',
  authorAvatar: null,
  title: 'Hỏi về SOLID',
  body: 'Nguyên lý nào quan trọng nhất?',
  label: 'QUESTION',
  voteScore: 0,
  replyCount: 2,
  reactions: { counts: {}, total: 0, myReaction: null },
  backgroundKey: null,
  acceptedReplyId: null,
  isBookmarked: false,
  createdAt: new Date().toISOString(),
  attachments: [],
};

function page(content: FeedPost[]) {
  return { content, number: 0, totalPages: 1 };
}

function renderFeed() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FeedTabScreen />
    </QueryClientProvider>,
  );
}

describe('FeedTabScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.fetchStats.mockResolvedValue({ totalPosts: 12, unansweredCount: 3 });
  });

  it('heads the feed with a title and the group-wide numbers', async () => {
    api.fetchFeed.mockResolvedValue(page([POST]));
    const screen = await renderFeed();

    expect(screen.getByText('Bảng tin')).toBeTruthy();
    expect(await screen.findByText('3')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('filters to unanswered questions from the header number', async () => {
    api.fetchFeed.mockResolvedValue(page([POST]));
    const screen = await renderFeed();
    await screen.findByText('Hỏi về SOLID');

    await fireEvent.press(screen.getByTestId('feed-stat-unanswered'));

    await waitFor(() => expect(api.fetchFeed).toHaveBeenLastCalledWith('UNANSWERED', 0));
  });

  it('toggles the saved list from the header button', async () => {
    api.fetchFeed.mockResolvedValue(page([POST]));
    const screen = await renderFeed();
    await screen.findByText('Hỏi về SOLID');

    await fireEvent.press(screen.getByTestId('feed-hero-saved'));
    await waitFor(() => expect(api.fetchFeed).toHaveBeenLastCalledWith('SAVED', 0));
    await fireEvent.press(screen.getByTestId('feed-hero-saved'));

    expect(screen.getByLabelText('Xem bài đã lưu')).toBeTruthy();
  });

  it('still shows the feed when the numbers fail to load', async () => {
    api.fetchStats.mockRejectedValue(new Error('down'));
    api.fetchFeed.mockResolvedValue(page([POST]));
    const screen = await renderFeed();

    expect(await screen.findByText('Hỏi về SOLID')).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('loads the newest posts first and never shows sample data', async () => {
    api.fetchFeed.mockResolvedValue(page([POST]));
    const screen = await renderFeed();

    expect(await screen.findByText('Hỏi về SOLID')).toBeTruthy();
    expect(api.fetchFeed).toHaveBeenCalledWith('NEW', 0);
    expect(screen.queryByText(/Hoàng Minh/)).toBeNull();
  });

  it('reads the saved list from the server when the saved tab is chosen', async () => {
    api.fetchFeed.mockResolvedValueOnce(page([])).mockResolvedValueOnce(page([{ ...POST, isBookmarked: true }]));
    const screen = await renderFeed();
    await screen.findByTestId('feed-empty');

    await fireEvent.press(screen.getByTestId('feed-filter-SAVED'));

    expect(await screen.findByText('Hỏi về SOLID')).toBeTruthy();
    expect(api.fetchFeed).toHaveBeenLastCalledWith('SAVED', 0);
  });

  it('saves a post through the API so the web sees it too', async () => {
    api.fetchFeed.mockResolvedValue(page([POST]));
    api.toggleBookmark.mockResolvedValue({ bookmarked: true });
    const screen = await renderFeed();

    await fireEvent.press(await screen.findByTestId(`post-bookmark-${POST.id}`));

    await waitFor(() => expect(api.toggleBookmark).toHaveBeenCalledWith(POST.id));
    await waitFor(() => expect(screen.getByLabelText('Bỏ lưu bài viết')).toBeTruthy());
  });

  it('tells the user when saving fails', async () => {
    api.fetchFeed.mockResolvedValue(page([POST]));
    api.toggleBookmark.mockRejectedValue(new Error('down'));
    const screen = await renderFeed();

    await fireEvent.press(await screen.findByTestId(`post-bookmark-${POST.id}`));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })));
  });

  it('opens the post when its comments are pressed', async () => {
    api.fetchFeed.mockResolvedValue(page([POST]));
    const screen = await renderFeed();

    await fireEvent.press(await screen.findByTestId(`post-comments-${POST.id}`));

    expect(router.push).toHaveBeenCalledWith(`/post/${POST.workspaceId}/${POST.id}?saved=0`);
  });

  it('explains an empty unanswered list', async () => {
    api.fetchFeed.mockResolvedValue(page([]));
    const screen = await renderFeed();

    await fireEvent.press(screen.getByTestId('feed-filter-UNANSWERED'));

    expect(await screen.findByText('Mọi câu hỏi đều đã được giải đáp')).toBeTruthy();
  });

  it('offers a retry when the feed fails to load', async () => {
    api.fetchFeed.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(page([POST]));
    const screen = await renderFeed();

    await fireEvent.press(await screen.findByText('Không tải được bảng tin. Chạm để thử lại.'));

    expect(await screen.findByText('Hỏi về SOLID')).toBeTruthy();
  });
});
