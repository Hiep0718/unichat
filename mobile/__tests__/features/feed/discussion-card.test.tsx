import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DiscussionCard } from '../../../src/features/feed/components/discussion-card';
import { DiscussionItem } from '../../../src/features/feed/feed-types';

describe('DiscussionCard', () => {
  const mockItem: DiscussionItem = {
    id: 'f-1',
    title: 'Câu hỏi về Adaptive RAG',
    body: 'Làm thế nào để điều chỉnh ngưỡng tương đồng vector?',
    authorName: 'Nguyễn Văn A',
    workspaceName: 'Khoa CNTT',
    label: 'QUESTION',
    voteScore: 12,
    replyCount: 4,
    createdAt: '1 giờ trước',
    hasAiAnswer: true,
    pinned: true,
  };

  it('renders card title, body, author, and badges', () => {
    const onVoteMock = jest.fn();
    const { getByText } = render(
      <DiscussionCard
        item={mockItem}
        index={0}
        hasVoted={false}
        onVote={onVoteMock}
      />
    );

    expect(getByText('Câu hỏi về Adaptive RAG')).toBeTruthy();
    expect(getByText('Làm thế nào để điều chỉnh ngưỡng tương đồng vector?')).toBeTruthy();
    expect(getByText('Nguyễn Văn A')).toBeTruthy();
    expect(getByText('Ghim')).toBeTruthy();
    expect(getByText('Đã có lời giải AI')).toBeTruthy();
    expect(getByText('4 thảo luận')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
  });

  it('triggers onVote when vote button is pressed', () => {
    const onVoteMock = jest.fn();
    const { getByText } = render(
      <DiscussionCard
        item={mockItem}
        index={0}
        hasVoted={false}
        onVote={onVoteMock}
      />
    );

    fireEvent.press(getByText('12'));
    expect(onVoteMock).toHaveBeenCalledWith('f-1');
  });
});
