import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MessageAttachments } from './message-attachments';
import * as apiClient from '../../../lib/api-client';
import type { ChatAttachment } from '../work-chat-api';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

// jsdom implements neither; the component only hands a URL to the browser, so
// stubs are enough to assert what it renders and what it releases.
URL.createObjectURL = vi.fn(() => 'blob:mock-attachment');
URL.revokeObjectURL = vi.fn();

const image: ChatAttachment = {
  id: 'a1',
  kind: 'IMAGE',
  originalName: 'anh-nhom.png',
  mediaType: 'image/png',
  byteSize: 2048,
};

const pdfFile: ChatAttachment = {
  id: 'a2',
  kind: 'FILE',
  originalName: 'bao-cao.pdf',
  mediaType: 'application/pdf',
  byteSize: 3 * 1024 * 1024,
};

function renderWith(attachments: ChatAttachment[]) {
  return render(
    <MessageAttachments conversationId="c1" messageId="m1" attachments={attachments} />,
  );
}

describe('MessageAttachments', () => {
  it('should render nothing for a message that carries no files', () => {
    // Arrange and Act
    const { container } = renderWith([]);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it('should show an image inline, fetched through the authorised endpoint', async () => {
    // Arrange: an <img src> cannot carry a bearer token, so the bytes come
    // through the API client and become a blob URL.
    const fetchBlob = vi
      .spyOn(apiClient, 'fetchBlob')
      .mockResolvedValue(new Blob(['png'], { type: 'image/png' }));

    // Act
    renderWith([image]);

    // Assert
    const rendered = await screen.findByAltText('anh-nhom.png');
    expect(rendered).toHaveAttribute('src', 'blob:mock-attachment');
    expect(fetchBlob).toHaveBeenCalledWith(
      '/work-chat/conversations/c1/messages/m1/attachments/a1/content',
    );
  });

  it('should release the blob URL when the bubble goes away', async () => {
    // Arrange: a thread scrolled through for a while would otherwise hold
    // every image it ever rendered.
    vi.spyOn(apiClient, 'fetchBlob').mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    const { unmount } = renderWith([image]);
    await screen.findByAltText('anh-nhom.png');

    // Act
    unmount();

    // Assert
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-attachment');
  });

  it('should say so when an image cannot be loaded', async () => {
    // Arrange
    vi.spyOn(apiClient, 'fetchBlob').mockRejectedValue(new Error('offline'));

    // Act
    renderWith([image]);

    // Assert
    expect(await screen.findByText('Không tải được ảnh')).toBeInTheDocument();
  });

  it('should offer a non-image as a download rather than rendering it', async () => {
    // Arrange and Act
    renderWith([pdfFile]);

    // Assert: the name and size are shown without fetching anything yet.
    expect(screen.getByLabelText('Tải bao-cao.pdf')).toBeInTheDocument();
    expect(screen.getByText('bao-cao.pdf')).toBeInTheDocument();
    expect(screen.getByText('3.0 MB')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument());
  });
});
