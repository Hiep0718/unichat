import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { workplace } from '../../../src/design/tokens';
import { DiscussionCard } from '../../../src/features/feed/components/discussion-card';
import { FeedPost } from '../../../src/features/feed/feed-types';

const BASE: FeedPost = {
  id: 'p-1',
  workspaceId: '0193a1f0-aaaa-7000-8000-00000000000a',
  workspaceName: 'Khoa CNTT',
  authorId: 'u-1',
  authorName: 'Nguyễn Văn A',
  authorAvatar: null,
  title: 'Câu hỏi về Adaptive RAG',
  body: 'Làm thế nào để điều chỉnh ngưỡng tương đồng vector?',
  label: 'QUESTION',
  voteScore: 12,
  replyCount: 4,
  reactions: { counts: {}, total: 0, myReaction: null },
  backgroundKey: null,
  acceptedReplyId: null,
  isBookmarked: false,
  createdAt: new Date().toISOString(),
  attachments: [],
};

const renderCard = (overrides: Partial<FeedPost> = {}, onBookmark?: jest.Mock) =>
  render(
    <DiscussionCard post={{ ...BASE, ...overrides }} index={0} onBookmark={onBookmark} />
  );

describe('DiscussionCard', () => {
  it('should lead with the group, not the author, the way the web card does', () => {
    const { getByText } = renderCard();

    expect(getByText('Khoa CNTT')).toBeTruthy();
    expect(getByText(/Nguyễn Văn A/)).toBeTruthy();
    expect(getByText('Câu hỏi về Adaptive RAG')).toBeTruthy();
    expect(getByText('4 bình luận')).toBeTruthy();
  });

  it('should report a question as discussing once it has replies but no accepted one', () => {
    expect(renderCard().getByText('Đang thảo luận')).toBeTruthy();
  });

  it('should report a question with no replies as unanswered', () => {
    expect(renderCard({ replyCount: 0 }).getByText('Chưa có lời giải')).toBeTruthy();
  });

  it('should report a question as resolved once an answer is accepted', () => {
    expect(renderCard({ acceptedReplyId: 'r-9' }).getByText('Đã giải đáp')).toBeTruthy();
  });

  it('should give an announcement its label and no resolution state', () => {
    // Nobody is waiting on an announcement, so "chưa có lời giải" would be a
    // claim about it that is not true of any announcement.
    const { getByText, queryByText } = renderCard({ label: 'ANNOUNCEMENT' });

    expect(getByText('Thông báo')).toBeTruthy();
    expect(queryByText('Chưa có lời giải')).toBeNull();
    expect(queryByText('Đang thảo luận')).toBeNull();
  });

  it('should strip Markdown from the preview rather than show the source', () => {
    const { getByText, queryByText } = renderCard({
      body: '## Tiêu đề\nMột đoạn **in đậm** và `mã nguồn`.',
    });

    expect(getByText('Tiêu đề Một đoạn in đậm và mã nguồn.')).toBeTruthy();
    expect(queryByText(/##|\*\*/)).toBeNull();
  });

  it('should show the reaction faces that were actually used', () => {
    const { getByText } = renderCard({
      reactions: { counts: { LIKE: 7, LOVE: 2 }, total: 9, myReaction: null },
    });

    expect(getByText('👍❤️')).toBeTruthy();
    expect(getByText('9')).toBeTruthy();
  });

  it('should say how many files are attached', () => {
    const { getByText } = renderCard({
      attachments: [
        {
          id: 'a-1',
          kind: 'DOCUMENT',
          originalName: 'slide.pdf',
          mediaType: 'application/pdf',
          byteSize: 1000,
        },
      ],
    });

    expect(getByText('1 tệp đính kèm')).toBeTruthy();
  });

  it('should hand the post id back when the bookmark is pressed', () => {
    const onBookmark = jest.fn();
    const { getByLabelText } = renderCard({}, onBookmark);

    fireEvent.press(getByLabelText('Lưu bài viết'));

    expect(onBookmark).toHaveBeenCalledWith('p-1');
  });
});

/** The card's outermost node; `toJSON` widens to an array it never returns. */
function rootStyle(tree: ReturnType<typeof renderCard>) {
  const root = tree.toJSON();
  const node = Array.isArray(root) ? root[0] : root;
  return StyleSheet.flatten(node!.props.style);
}

describe('DiscussionCard visual contract', () => {
  it('should separate the card by elevation alone, never by a border', () => {
    // A card carrying both a border and a shadow reads as a wireframe, which
    // is what the web design notes set out to leave behind. This card used to
    // draw a 1px #E2E8F0 outline on top of its shadow.
    const style = rootStyle(renderCard());

    expect(style.backgroundColor).toBe(workplace.card);
    expect(style.shadowOpacity).toBeGreaterThan(0);
    expect(style.borderWidth).toBeUndefined();
    expect(style.borderColor).toBeUndefined();
  });

  it('should keep the title in ink, leaving accent for what can be acted on', () => {
    const style = StyleSheet.flatten(
      renderCard().getByText('Câu hỏi về Adaptive RAG').props.style
    );

    expect(style.color).toBe(workplace.ink);
    expect(style.color).not.toBe(workplace.accent);
  });

  it('should draw body text in the softer ink, not the heading ink', () => {
    const style = StyleSheet.flatten(
      renderCard().getByText('Làm thế nào để điều chỉnh ngưỡng tương đồng vector?').props
        .style
    );

    expect(style.color).toBe(workplace.inkSoft);
  });
});
