import React from 'react';
import { render } from '@testing-library/react-native';

import { DiscussionCard } from '../../../src/features/feed/components/discussion-card';

import type { FeedPost } from '../../../src/features/feed/feed-types';

const basePost: FeedPost = {
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
  reactions: { counts: {}, total: 0, myReaction: null },
  backgroundKey: null,
  acceptedReplyId: null,
  isBookmarked: false,
  createdAt: new Date().toISOString(),
  attachments: [],
};

function renderCard(post: FeedPost, props: { hideGroup?: boolean; pinned?: boolean } = {}) {
  return render(
    <DiscussionCard
      post={post}
      index={0}
      hideGroup={props.hideGroup ?? false}
      pinned={props.pinned ?? false}
    />,
  );
}

describe('DiscussionCard inside a group', () => {
  it('should drop the group name where every card belongs to one group', async () => {
    // Arrange, Act
    const { queryByText } = await renderCard(basePost, { hideGroup: true });

    // Assert
    expect(queryByText('Mongodb')).toBeNull();
  });

  it('should keep naming the group in the global feed', async () => {
    // Arrange, Act
    const { getByText } = await renderCard(basePost);

    // Assert
    expect(getByText('Mongodb')).toBeTruthy();
  });

  it('should mark a pinned post', async () => {
    // Arrange, Act
    const { getByText } = await renderCard(basePost, { hideGroup: true, pinned: true });

    // Assert
    expect(getByText('Đã ghim')).toBeTruthy();
  });

  it('should leave an ordinary post unmarked', async () => {
    // Arrange, Act
    const { queryByText } = await renderCard(basePost, { hideGroup: true });

    // Assert
    expect(queryByText('Đã ghim')).toBeNull();
  });
});

describe('DiscussionCard assistant marker', () => {
  it('should say so when the assistant has answered the post', async () => {
    // Arrange, Act
    const { getByText } = await renderCard(
      { ...basePost, hasAiAnswer: true },
      { hideGroup: true },
    );

    // Assert
    expect(getByText('Trợ lý AI đã trả lời')).toBeTruthy();
  });

  it('should stay silent when the assistant has not answered', async () => {
    // Arrange, Act
    const { queryByText } = await renderCard(
      { ...basePost, hasAiAnswer: false },
      { hideGroup: true },
    );

    // Assert
    expect(queryByText('Trợ lý AI đã trả lời')).toBeNull();
  });

  it('should stay silent where the endpoint does not report the marker', async () => {
    // Arrange, Act: bảng tin toàn cục không gửi trường này, và một trường vắng
    // mặt phải đọc ra "chưa biết" chứ không phải "có".
    const { queryByText } = await renderCard(basePost);

    // Assert
    expect(queryByText('Trợ lý AI đã trả lời')).toBeNull();
  });
});
