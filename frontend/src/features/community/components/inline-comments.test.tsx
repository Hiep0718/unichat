import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedCard } from './feed-card';
import * as communityApi from '../community-api';
import * as authContext from '../../auth/auth-context';
import * as feedApi from '../feed-api';

import type { ReactionSummary, ReplyResponse } from '../community-api';
import type { FeedPostResponse } from '../feed-api';

/** Nobody has reacted yet — the shape the API returns for a fresh post. */
const noReactions: ReactionSummary = { counts: {}, total: 0, myReaction: null };

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

/** Signed in as someone who is not the post's author, unless a test says so. */
function signedInAs(userId: string) {
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: { id: userId },
  } as ReturnType<typeof authContext.useAuth>);
}

beforeEach(() => signedInAs('someone-else'));

const post: FeedPostResponse = {
  id: 'p1',
  workspaceId: 'w1',
  workspaceName: 'Khoa học dữ liệu',
  authorId: 'u1',
  authorName: 'Hùng',
  authorAvatar: null,
  title: 'Câu hỏi về index',
  body: 'Vì sao index chậm?',
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

const reply: ReplyResponse = {
  id: 'r1',
  discussionId: 'p1',
  parentReplyId: null,
  authorId: 'u2',
  authorName: 'An',
  authorAvatar: null,
  body: 'Thử EXPLAIN ANALYZE xem',
  isAiAnswer: false,
  voteScore: 0,
  reactions: noReactions,
  citations: [],
  createdAt: new Date().toISOString(),
};

function renderCard() {
  return render(
    <FeedCard post={post} onOpen={() => {}} onNavigate={() => {}} onBookmark={() => {}} />,
  );
}

describe('FeedCard comments', () => {
  it('should not request replies until the thread is opened', () => {
    // Arrange: a feed of twenty cards must not fire twenty reply requests.
    const fetchReplies = vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([]);

    // Act
    renderCard();

    // Assert
    expect(fetchReplies).not.toHaveBeenCalled();
  });

  it('should open the thread in place rather than navigating away', async () => {
    // Arrange
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    const onOpen = vi.fn();
    render(
      <FeedCard post={post} onOpen={onOpen} onNavigate={() => {}} onBookmark={() => {}} />,
    );

    // Act
    fireEvent.click(screen.getByText(/1 bình luận/));

    // Assert: the comment button must not be the one that leaves the feed.
    expect(onOpen).not.toHaveBeenCalled();
    expect(await screen.findByText('Thử EXPLAIN ANALYZE xem')).toBeInTheDocument();
  });

  it('should close the thread again on a second click', async () => {
    // Arrange
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    renderCard();
    const toggle = screen.getByText(/1 bình luận/);

    // Act
    fireEvent.click(toggle);
    await screen.findByText('Thử EXPLAIN ANALYZE xem');
    fireEvent.click(screen.getByText(/1 bình luận/));

    // Assert
    expect(screen.queryByText('Thử EXPLAIN ANALYZE xem')).not.toBeInTheDocument();
  });

  it('should say so when there is nothing to read yet', async () => {
    // Arrange
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([]);
    renderCard();

    // Act
    fireEvent.click(screen.getByText(/1 bình luận/));

    // Assert
    expect(await screen.findByText(/Chưa có bình luận nào/)).toBeInTheDocument();
  });

  it('should keep the card usable when replies cannot be loaded', async () => {
    // Arrange: a failed thread must not blank the post above it.
    vi.spyOn(communityApi, 'fetchReplies').mockRejectedValue(new Error('500'));
    renderCard();

    // Act
    fireEvent.click(screen.getByText(/1 bình luận/));

    // Assert
    expect(await screen.findByText(/Không tải được bình luận/)).toBeInTheDocument();
    expect(screen.getByText('Câu hỏi về index')).toBeInTheDocument();
  });

  it('should raise the count after a comment is posted', async () => {
    // Arrange
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    vi.spyOn(communityApi, 'addReply').mockResolvedValue({
      ...reply,
      id: 'r2',
      body: 'Mình cũng gặp',
    });
    renderCard();
    fireEvent.click(screen.getByText(/1 bình luận/));
    await screen.findByText('Thử EXPLAIN ANALYZE xem');

    // Act
    const box = screen.getByPlaceholderText(/Viết bình luận/);
    fireEvent.change(box, { target: { value: 'Mình cũng gặp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bình luận' }));

    // Assert: counted from the thread rather than refetching the feed, which
    // would also throw away the reader's scroll position.
    await waitFor(() => expect(screen.getByText(/2 bình luận/)).toBeInTheDocument());
  });
});

describe('FeedCard inside a group', () => {
  it('should not repeat the group name inside that group', () => {
    // Arrange and Act: every card there belongs to the group the reader is
    // already looking at.
    render(
      <FeedCard post={post} onOpen={() => {}} onNavigate={() => {}} hideGroup />,
    );

    // Assert
    expect(screen.queryByText('Khoa học dữ liệu')).not.toBeInTheDocument();
  });

  it('should still open comments in place there', async () => {
    // Arrange: the group list used to navigate away on any click, so this is
    // the behaviour that had to reach it.
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    render(
      <FeedCard post={post} onOpen={() => {}} onNavigate={() => {}} hideGroup />,
    );

    // Act
    fireEvent.click(screen.getByText(/1 bình luận/));

    // Assert
    expect(await screen.findByText('Thử EXPLAIN ANALYZE xem')).toBeInTheDocument();
  });

  it('should show a coloured post on its colour there too', () => {
    // Arrange and Act
    const { container } = render(
      <FeedCard
        post={{ ...post, backgroundKey: 'ocean' }}
        onOpen={() => {}}
        onNavigate={() => {}}
        hideGroup
      />,
    );

    // Assert
    expect(container.querySelector('.post-bg')).toBeInTheDocument();
  });

  it('should hide the bookmark button where there is no bookmark list', () => {
    // Arrange and Act: passing no handler is how a caller says so.
    render(<FeedCard post={post} onOpen={() => {}} onNavigate={() => {}} hideGroup />);

    // Assert
    expect(screen.queryByLabelText(/lưu bài viết/i)).not.toBeInTheDocument();
  });

  it('should mark a pinned post as pinned', () => {
    // Arrange and Act
    render(
      <FeedCard post={post} onOpen={() => {}} onNavigate={() => {}} hideGroup pinned />,
    );

    // Assert
    expect(screen.getByText('Đã ghim')).toBeInTheDocument();
  });
});

describe('accepting an answer from the feed', () => {
  it('should offer the control to the asker without leaving the feed', async () => {
    // Arrange: the button used to exist only on the post's own page, so the
    // asker had to navigate away from the answer they were reading.
    signedInAs(post.authorId);
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    renderCard();

    // Act
    fireEvent.click(screen.getByText(/1 bình luận/));

    // Assert
    expect(await screen.findByText(/Chấp nhận/)).toBeInTheDocument();
  });

  it('should not offer it to anyone but the asker', async () => {
    // Arrange: only the person who asked knows whether it is settled.
    signedInAs('a-bystander');
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    renderCard();

    // Act
    fireEvent.click(screen.getByText(/1 bình luận/));
    await screen.findByText('Thử EXPLAIN ANALYZE xem');

    // Assert
    expect(screen.queryByText(/Chấp nhận/)).not.toBeInTheDocument();
  });

  it('should take the answer back when the accepted reply is chosen again', async () => {
    // Arrange: accepting used to be one-way, so a misclick was permanent.
    signedInAs(post.authorId);
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    const clear = vi.spyOn(feedApi, 'clearAcceptedReply').mockResolvedValue();
    render(
      <FeedCard
        post={{ ...post, acceptedReplyId: reply.id }}
        onOpen={() => {}}
        onNavigate={() => {}}
        onBookmark={() => {}}
      />,
    );

    // Act
    fireEvent.click(screen.getByText(/1 bình luận/));
    fireEvent.click(await screen.findByText(/Bỏ chấp nhận/));

    // Assert
    await waitFor(() =>
      expect(clear).toHaveBeenCalledWith(post.workspaceId, post.id));
  });

  it('should move the question back to unresolved once taken back', async () => {
    // Arrange
    signedInAs(post.authorId);
    vi.spyOn(communityApi, 'fetchReplies').mockResolvedValue([reply]);
    vi.spyOn(feedApi, 'clearAcceptedReply').mockResolvedValue();
    render(
      <FeedCard
        post={{ ...post, acceptedReplyId: reply.id, replyCount: 1 }}
        onOpen={() => {}}
        onNavigate={() => {}}
        onBookmark={() => {}}
      />,
    );
    fireEvent.click(screen.getByText(/1 bình luận/));

    // Act
    fireEvent.click(await screen.findByText(/Bỏ chấp nhận/));

    // Assert: the card's own chip follows, without refetching the feed.
    await waitFor(() =>
      expect(screen.getByText('Đang thảo luận')).toBeInTheDocument());
  });
});
