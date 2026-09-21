import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { AttachmentSummary } from './attachment-summary';
import type { PostAttachment } from '../community-api';

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

describe('AttachmentSummary', () => {
  it('should render nothing for an image, which is never summarised', () => {
    // Arrange and Act
    const { container } = render(
      <AttachmentSummary
        attachment={attachment({ kind: 'IMAGE', summaryState: 'NOT_APPLICABLE' })}
      />,
    );

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it('should show the summary so a reader can judge the file without opening it', () => {
    // Arrange and Act
    render(<AttachmentSummary attachment={attachment()} />);

    // Assert
    expect(screen.getByText(/đánh chỉ mục trong CSDL/)).toBeInTheDocument();
  });

  it('should let the reader collapse a summary they do not want', async () => {
    // Arrange
    render(<AttachmentSummary attachment={attachment()} />);

    // Act
    await userEvent.click(screen.getByRole('button'));

    // Assert
    expect(screen.queryByText(/đánh chỉ mục trong CSDL/)).not.toBeInTheDocument();
  });

  it('should say the assistant is still reading while ingestion runs', () => {
    // Arrange and Act
    render(<AttachmentSummary attachment={attachment({ summaryState: 'PENDING' })} />);

    // Assert
    expect(screen.getByText(/đang đọc tài liệu/)).toBeInTheDocument();
  });

  it('should explain the wait is on approval when the file never reached the library', () => {
    // Arrange: no documentId means it is not in the library yet.
    render(
      <AttachmentSummary
        attachment={attachment({ summaryState: 'PENDING', documentId: null })}
      />,
    );

    // Assert
    expect(screen.getByText(/chờ duyệt/)).toBeInTheDocument();
  });

  it('should say plainly when no summary is coming', () => {
    // Arrange and Act
    render(
      <AttachmentSummary
        attachment={attachment({ summaryState: 'UNAVAILABLE', aiSummary: null })}
      />,
    );

    // Assert
    expect(screen.getByText(/Chưa tạo được tóm tắt/)).toBeInTheDocument();
  });

  it('should not promise a summary that is marked ready but missing', () => {
    // Arrange: a READY row with no text would otherwise render an empty block.
    render(<AttachmentSummary attachment={attachment({ aiSummary: null })} />);

    // Assert
    expect(screen.getByText(/Chưa tạo được tóm tắt/)).toBeInTheDocument();
  });
});
