import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AttachmentSummary } from './attachment-summary';
import * as summaryApi from '../attachment-summary-api';
import { ApiError } from '../../../lib/api-client';

import type { PostAttachment } from '../community-api';

vi.mock('../attachment-summary-api', () => ({
  requestAttachmentSummary: vi.fn(),
  awaitAttachmentSummary: vi.fn(),
}));

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

const attachment = (overrides: Partial<PostAttachment> = {}): PostAttachment => ({
  id: 'a1',
  kind: 'DOCUMENT',
  originalName: 'giao-trinh-csdl.pdf',
  mediaType: 'application/pdf',
  byteSize: 2048,
  documentId: 'd1',
  aiSummary: 'Tài liệu trình bày cách đánh chỉ mục trong CSDL quan hệ.',
  summaryState: 'READY',
  ...overrides,
});

const notAsked = () => attachment({ summaryState: 'PENDING', aiSummary: null });

function show(value: PostAttachment) {
  return render(<AttachmentSummary workspaceId="ws" discussionId="post" attachment={value} />);
}

describe('AttachmentSummary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should render nothing for an image, which is never summarised', () => {
    // Arrange and Act
    const { container } = show(attachment({ kind: 'IMAGE', summaryState: 'NOT_APPLICABLE' }));

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it('should show the summary so a reader can judge the file without opening it', () => {
    // Arrange and Act
    show(attachment());

    // Assert
    expect(screen.getByText(/đánh chỉ mục trong CSDL/)).toBeInTheDocument();
  });

  it('should let the reader collapse a summary they do not want', async () => {
    // Arrange
    show(attachment());

    // Act
    await userEvent.click(screen.getByRole('button'));

    // Assert
    expect(screen.queryByText(/đánh chỉ mục trong CSDL/)).not.toBeInTheDocument();
  });

  it('should offer to summarise a document nobody has asked about yet', () => {
    // Arrange and Act
    show(notAsked());

    // Assert
    expect(screen.getByRole('button', { name: 'Tóm tắt bằng AI' })).toBeInTheDocument();
  });

  it('should explain the wait is on approval when the file never reached the library', () => {
    // Arrange: no documentId means it is not in the library yet.
    show(attachment({ summaryState: 'PENDING', documentId: null }));

    // Assert
    expect(screen.getByText(/chờ duyệt/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should say plainly when the last attempt failed and offer to try again', () => {
    // Arrange and Act
    show(attachment({ summaryState: 'UNAVAILABLE', aiSummary: null }));

    // Assert
    expect(screen.getByText(/Chưa tạo được tóm tắt/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử tóm tắt lại' })).toBeInTheDocument();
  });

  it('should not promise a summary that is marked ready but missing', () => {
    // Arrange: a READY row with no text would otherwise render an empty block.
    show(attachment({ aiSummary: null }));

    // Assert
    expect(screen.getByText(/Chưa tạo được tóm tắt/)).toBeInTheDocument();
  });

  it('should show the summary once the assistant produced it', async () => {
    // Arrange
    let finish: (value: PostAttachment) => void = () => {};
    vi.mocked(summaryApi.requestAttachmentSummary).mockResolvedValue(notAsked());
    vi.mocked(summaryApi.awaitAttachmentSummary).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    show(notAsked());

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Tóm tắt bằng AI' }));

    // Assert: reading while it runs, then the summary.
    expect(await screen.findByText(/đang đọc tài liệu/)).toBeInTheDocument();
    finish(attachment({ aiSummary: 'Bản tóm tắt mới.' }));
    expect(await screen.findByText('Bản tóm tắt mới.')).toBeInTheDocument();
    expect(summaryApi.requestAttachmentSummary).toHaveBeenCalledWith('ws', 'post', 'a1');
  });

  it("should show the server's reason when the request is refused", async () => {
    // Arrange
    vi.mocked(summaryApi.requestAttachmentSummary).mockRejectedValue(
      new ApiError(409, 'Tài liệu chưa sẵn sàng để AI đọc. Hãy thử lại sau khi tài liệu xử lý xong.'),
    );
    show(notAsked());

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Tóm tắt bằng AI' }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Tài liệu chưa sẵn sàng để AI đọc');
    expect(summaryApi.awaitAttachmentSummary).not.toHaveBeenCalled();
  });

  it('should tell the reader to come back when the summary takes too long', async () => {
    // Arrange
    vi.mocked(summaryApi.requestAttachmentSummary).mockResolvedValue(notAsked());
    vi.mocked(summaryApi.awaitAttachmentSummary).mockResolvedValue(null);
    show(notAsked());

    // Act
    await userEvent.click(screen.getByRole('button', { name: 'Tóm tắt bằng AI' }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('chưa tóm tắt xong');
  });
});
