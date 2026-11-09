import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';

import PostDetailScreen from '../../../app/post/[workspaceId]/[postId]';
import { feedApi } from '../../../src/features/feed/feed-api';

import type { DiscussionDetail, ReplyItem } from '../../../src/features/feed/feed-types';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@ronradtke/react-native-markdown-display', () => {
  const { Text } = require('react-native');
  return ({ children }: { children: string }) => <Text>{children}</Text>;
});
jest.mock('../../../src/features/feed/feed-api', () => ({
  ...jest.requireActual('../../../src/features/feed/feed-api'),
  feedApi: {
    getDiscussion: jest.fn(),
    fetchReplies: jest.fn(),
    addReply: jest.fn(),
    acceptReply: jest.fn(),
    clearAcceptedReply: jest.fn(),
    toggleBookmark: jest.fn(),
    toggleReaction: jest.fn(),
  },
}));
const mockUser = { id: 'asker' };
jest.mock('../../../src/features/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, user: mockUser }),
}));
const mockShowToast = jest.fn();
jest.mock('../../../src/lib/toast-context', () => ({ useToast: () => ({ showToast: mockShowToast }) }));

const api = jest.mocked(feedApi);
const WS = '123e4567-e89b-12d3-a456-426614174000';
const ID = '223e4567-e89b-12d3-a456-426614174000';

const DETAIL: DiscussionDetail = {
  id: ID,
  workspaceId: WS,
  workspaceName: 'Khoa CNTT',
  authorId: 'asker',
  authorName: 'Lan',
  title: 'Hỏi về SOLID',
  body: 'Nguyên lý nào quan trọng nhất?',
  label: 'QUESTION',
  pinned: false,
  replyCount: 2,
  createdAt: new Date().toISOString(),
  editedAt: null,
  reactions: { counts: {}, total: 0, myReaction: null },
  backgroundKey: null,
  acceptedReplyId: null,
  hasAiAnswer: false,
  attachments: [],
};

function reply(id: string, body: string, parentReplyId: string | null = null): ReplyItem {
  return {
    id,
    discussionId: ID,
    authorId: `a-${id}`,
    authorName: `Người ${id}`,
    authorAvatar: null,
    body,
    parentReplyId,
    isAiAnswer: false,
    createdAt: new Date().toISOString(),
    voteScore: 0,
    reactions: { counts: {}, total: 0, myReaction: null },
    citations: [],
  };
}

function renderDetail(params: Record<string, string> = { workspaceId: WS, postId: ID, saved: '0' }) {
  jest.mocked(useLocalSearchParams).mockReturnValue(params);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PostDetailScreen />
    </QueryClientProvider>,
  );
}

describe('PostDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.id = 'asker';
    api.getDiscussion.mockResolvedValue(DETAIL);
    api.fetchReplies.mockResolvedValue([reply('r1', 'Single responsibility'), reply('r2', 'Đồng ý', 'r1')]);
  });

  it('shows the full post and its threaded comments', async () => {
    const screen = await renderDetail();

    expect(await screen.findByText('Hỏi về SOLID')).toBeTruthy();
    expect(screen.getByText('Nguyên lý nào quan trọng nhất?')).toBeTruthy();
    expect(await screen.findByText('Single responsibility')).toBeTruthy();
    expect(screen.getByText('Đồng ý')).toBeTruthy();
    expect(screen.getByText('Bình luận (2)')).toBeTruthy();
  });

  it('sends a comment and adds it to the thread', async () => {
    api.addReply.mockResolvedValue(reply('r3', 'Cảm ơn mọi người'));
    const screen = await renderDetail();
    await screen.findByText('Single responsibility');

    await fireEvent.changeText(screen.getByTestId('comment-input'), 'Cảm ơn mọi người');
    await fireEvent.press(screen.getByTestId('comment-send'));

    expect(await screen.findByText('Cảm ơn mọi người')).toBeTruthy();
    expect(api.addReply).toHaveBeenCalledWith(WS, ID, 'Cảm ơn mọi người', undefined);
    expect(screen.getByText('Bình luận (3)')).toBeTruthy();
  });

  it('replies under a chosen comment', async () => {
    api.addReply.mockResolvedValue(reply('r3', 'Chuẩn', 'r1'));
    const screen = await renderDetail();

    await fireEvent.press(await screen.findByTestId('reply-to-r1'));
    expect(screen.getByPlaceholderText('Viết câu trả lời...')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('comment-input'), 'Chuẩn');
    await fireEvent.press(screen.getByTestId('comment-send'));

    await waitFor(() => expect(api.addReply).toHaveBeenCalledWith(WS, ID, 'Chuẩn', 'r1'));
  });

  it('keeps the text and reports the error when a comment fails', async () => {
    api.addReply.mockRejectedValue(new Error('Mất kết nối'));
    const screen = await renderDetail();
    await screen.findByText('Single responsibility');

    await fireEvent.changeText(screen.getByTestId('comment-input'), 'thử lại');
    await fireEvent.press(screen.getByTestId('comment-send'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith({ message: 'Mất kết nối', type: 'error' }));
    expect(screen.getByTestId('comment-input').props.value).toBe('thử lại');
  });

  it('lets the asker accept an answer', async () => {
    api.acceptReply.mockResolvedValue(undefined);
    const screen = await renderDetail();

    await fireEvent.press(await screen.findByTestId('accept-r1'));

    await waitFor(() => expect(api.acceptReply).toHaveBeenCalledWith(WS, ID, 'r1'));
    expect(await screen.findByText('Lời giải')).toBeTruthy();
  });

  it('hides accepting from anyone but the asker', async () => {
    mockUser.id = 'someone-else';
    const screen = await renderDetail();
    await screen.findByText('Single responsibility');

    expect(screen.queryByTestId('accept-r1')).toBeNull();
  });

  it('shows the assistant is answering after an @AI comment', async () => {
    api.addReply.mockResolvedValue(reply('r3', '@AI giải thích'));
    const screen = await renderDetail();
    await screen.findByText('Single responsibility');

    await fireEvent.changeText(screen.getByTestId('comment-input'), '@AI giải thích');
    await fireEvent.press(screen.getByTestId('comment-send'));

    expect(await screen.findByTestId('ai-pending')).toBeTruthy();
  });

  it('saves the post from the detail screen when the saved state is known', async () => {
    api.toggleBookmark.mockResolvedValue({ bookmarked: true });
    const screen = await renderDetail();

    await fireEvent.press(await screen.findByTestId(`post-bookmark-${ID}`));

    await waitFor(() => expect(screen.getByLabelText('Bỏ lưu bài viết')).toBeTruthy());
  });

  it('hides the save button when opened without a known saved state', async () => {
    const screen = await renderDetail({ workspaceId: WS, postId: ID });
    await screen.findByText('Hỏi về SOLID');

    expect(screen.queryByTestId(`post-bookmark-${ID}`)).toBeNull();
  });

  it('refuses a malformed address without calling the API', async () => {
    const screen = await renderDetail({ workspaceId: 'x', postId: ID });

    expect(screen.getByText('Bài viết không tồn tại.')).toBeTruthy();
    expect(api.getDiscussion).not.toHaveBeenCalled();
  });
});
