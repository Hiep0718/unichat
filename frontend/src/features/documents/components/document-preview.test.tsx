import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentPreview } from './document-preview';
import * as apiClient from '../../../lib/api-client';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);
afterEach(() => vi.restoreAllMocks());

// jsdom implements neither; the component only needs them to hand a URL to the
// browser, so a stub is enough to assert what it renders.
const objectUrls: string[] = [];
URL.createObjectURL = vi.fn(() => {
  const url = `blob:mock-${objectUrls.length}`;
  objectUrls.push(url);
  return url;
});
URL.revokeObjectURL = vi.fn();

function mockDownload(blob: Blob) {
  return vi.spyOn(apiClient, 'fetchBlob').mockResolvedValue(blob);
}

const props = {
  workspaceId: 'w1',
  documentId: 'd1',
  originalName: 'chuong-3.pdf',
  mediaType: 'application/pdf',
};

describe('DocumentPreview', () => {
  it('should render a PDF in a frame so the approver can read it in place', async () => {
    // Arrange
    mockDownload(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));

    // Act
    render(<DocumentPreview {...props} />);

    // Assert
    const frame = await screen.findByTitle('chuong-3.pdf');
    expect(frame).toBeInTheDocument();
    expect(frame.tagName).toBe('IFRAME');
  });

  it('should offer a full window for a document too long to read inline', async () => {
    // Arrange and Act
    mockDownload(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
    render(<DocumentPreview {...props} />);

    // Assert
    expect(await screen.findByText(/Mở toàn màn hình/)).toBeInTheDocument();
  });

  it('should show a text file as text rather than handing it to a frame', async () => {
    // Arrange
    mockDownload(new Blob(['Chương 3: quan hệ một-nhiều'], { type: 'text/plain' }));

    // Act
    render(
      <DocumentPreview {...props} originalName="ghi-chu.txt" mediaType="text/plain" />,
    );

    // Assert
    expect(await screen.findByText(/quan hệ một-nhiều/)).toBeInTheDocument();
  });

  it('should offer a download for a format the browser cannot render', async () => {
    // Arrange: a browser shows an empty frame for DOCX, which reads as a bug.
    const docx = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    mockDownload(new Blob(['PK'], { type: docx }));

    // Act
    render(<DocumentPreview {...props} originalName="bao-cao.docx" mediaType={docx} />);

    // Assert
    expect(await screen.findByText(/Không xem trực tiếp được/)).toBeInTheDocument();
    expect(screen.getByText(/Tải xuống để xem/)).toBeInTheDocument();
  });

  it('should say the document could not be opened rather than showing a blank frame', async () => {
    // Arrange
    vi.spyOn(apiClient, 'fetchBlob').mockRejectedValue(new Error('403'));

    // Act
    render(<DocumentPreview {...props} />);

    // Assert
    expect(await screen.findByText(/Không mở được tài liệu/)).toBeInTheDocument();
  });

  it('should release the object URL when the preview is closed', async () => {
    // Arrange
    mockDownload(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
    const { unmount } = render(<DocumentPreview {...props} />);
    await screen.findByTitle('chuong-3.pdf');

    // Act
    unmount();

    // Assert: leaking one per opened document would hold whole files in memory.
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalled());
  });
});
