import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedCard } from './feed-card';
import * as authContext from '../../auth/auth-context';
import * as communityApi from '../community-api';

import type { ReactionSummary } from '../community-api';
import type { FeedPostResponse } from '../feed-api';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

const noReactions: ReactionSummary = { counts: {}, total: 0, myReaction: null };

beforeEach(() => {
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: { id: 'someone-else' },
  } as ReturnType<typeof authContext.useAuth>);
});

const basePost: FeedPostResponse = {
  id: 'p1',
  workspaceId: 'w1',
  workspaceName: 'Mongodb',
  authorId: 'u1',
  authorName: 'hungdz1372004',
  authorAvatar: null,
  title: 'Cho tôi đề mẫu',
  body: 'Câu trả lời từ tài liệu chưa giải quyết được thắc mắc của mình.',
  label: 'QUESTION',
  voteScore: 0,
  replyCount: 1,
  reactions: noReactions,
  backgroundKey: null,
  acceptedReplyId: null,
  isBookmarked: false,
  createdAt: new Date().toISOString(),
  attachments: [],
};

const STRIP = 'Trợ lý AI đã trả lời dựa trên tài liệu hiện có';

function renderCard(post: FeedPostResponse) {
  return render(
    <FeedCard post={post} onOpen={vi.fn()} onNavigate={vi.fn()} hideGroup />,
  );
}

describe('FeedCard assistant marker', () => {
  it('should say so when the assistant has answered the post', () => {
    // Arrange, Act
    renderCard({ ...basePost, hasAiAnswer: true });

    // Assert
    expect(screen.getByText(STRIP)).toBeTruthy();
  });

  it('should stay silent when the assistant has not answered', () => {
    // Arrange, Act
    renderCard({ ...basePost, hasAiAnswer: false });

    // Assert
    expect(screen.queryByText(STRIP)).toBeNull();
  });

  it('should stay silent where the endpoint does not report the marker', () => {
    // Arrange, Act: the global feed sends no such field, and an absent field
    // must read as "not known" rather than as "yes".
    const withoutField: FeedPostResponse = { ...basePost };
    delete withoutField.hasAiAnswer;
    renderCard(withoutField);

    // Assert
    expect(screen.queryByText(STRIP)).toBeNull();
  });

  it('should open the thread in place rather than navigating away', async () => {
    // Arrange: the assistant's answer is one of the replies, so "Xem" belongs
    // to the card's own comments and must not cost the reader their place.
    const onOpen = vi.fn();
    const onNavigate = vi.fn();
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([]);
    render(
      <FeedCard
        post={{ ...basePost, hasAiAnswer: true }}
        onOpen={onOpen}
        onNavigate={onNavigate}
        hideGroup
      />,
    );

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Xem' }));

    // Assert
    expect(onOpen).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(communityApi.fetchReplies).toHaveBeenCalledWith('w1', 'p1');
  });
});

describe('FeedCard post kind', () => {
  it('should name the kind of post beside its date', () => {
    // Arrange, Act
    renderCard({ ...basePost, hasAiAnswer: false });

    // Assert
    expect(screen.getByText('Câu hỏi')).toBeTruthy();
  });

  it('should keep the kind separate from the resolution state', () => {
    // Arrange, Act: one says what the post is, the other whether it is
    // settled, so an answered question shows both.
    renderCard({ ...basePost, acceptedReplyId: 'r9', hasAiAnswer: false });

    // Assert
    expect(screen.getByText('Câu hỏi')).toBeTruthy();
    expect(screen.getByText('Đã có lời giải')).toBeTruthy();
  });
});
