import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentRows } from './document-rows';
import { duplicatedNames } from '../document-status';

import type { DocumentResponse, DocumentStatus } from '../document-api';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

function doc(
  status: DocumentStatus,
  originalName: string,
  byteSize = 448_8 * 100,
  mediaType = 'application/pdf',
): DocumentResponse {
  return {
    id: originalName + status,
    workspaceId: 'w1',
    storageKey: 'k',
    originalName,
    mediaType,
    byteSize,
    sha256: 'x',
    status,
    ingestionVersion: 1,
    pageOrBlockCount: 1,
    version: 1,
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
    uploadedBy: null,
    uploadedByEmail: null,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
  } as DocumentResponse;
}

function renderRows(
  documents: DocumentResponse[],
  options: { canEdit?: boolean; onDelete?: (id: string) => void } = {},
) {
  return render(
    <DocumentRows
      documents={documents}
      uploading={[]}
      duplicates={duplicatedNames(documents)}
      canEdit={options.canEdit ?? true}
      onDelete={options.onDelete ?? vi.fn()}
    />,
  );
}

describe('DocumentRows', () => {
  it('should say whether the assistant can use each file', () => {
    // Arrange, Act
    renderRows([
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
      doc('PROCESSING', '03_Chapter_Relationships.pdf'),
    ]);

    // Assert
    expect(screen.getByText('Sẵn sàng cho AI')).toBeTruthy();
    expect(screen.getByText('Đang xử lý')).toBeTruthy();
  });

  it('should not print the pipeline’s own vocabulary', () => {
    // Arrange, Act: the table used to show "Vector DB Ready" and "Tách
    // Vector...", which name the machinery rather than the answer.
    const { container } = renderRows([doc('PROCESSED', 'a.pdf'), doc('FAILED', 'b.pdf')]);

    // Assert
    expect(container.textContent).not.toMatch(/Vector/i);
  });

  it('should warn when two files share a name', () => {
    // Arrange, Act: someone choosing which to delete cannot otherwise tell
    // them apart.
    renderRows([
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
      doc('PROCESSED', '00_Chapter_Overview_Subject.pdf'),
      doc('PROCESSED', '01_Chapter_Introducing_Data_Modeling.pdf'),
    ]);

    // Assert
    expect(screen.getAllByText('Trùng tên với một tệp khác').length).toBe(2);
  });

  it('should leave distinct names unmarked', () => {
    // Arrange, Act
    renderRows([doc('PROCESSED', 'a.pdf'), doc('PROCESSED', 'b.pdf')]);

    // Assert
    expect(screen.queryByText('Trùng tên với một tệp khác')).toBeNull();
  });

  it('should show the kind beside the name rather than in its own column', () => {
    // Arrange, Act
    renderRows([
      doc('PROCESSED', 'bai.pdf'),
      doc('PROCESSED', 'ghi-chu.txt', 2048, 'text/plain'),
    ]);

    // Assert
    expect(screen.getByText('PDF')).toBeTruthy();
    expect(screen.getByText('TXT')).toBeTruthy();
  });

  it('should offer no way to delete anything to a member who may not', () => {
    // Arrange, Act
    renderRows([doc('PROCESSED', 'bai.pdf')], { canEdit: false });

    // Assert
    expect(screen.queryByLabelText('Xoá bai.pdf')).toBeNull();
  });

  it('should ask the caller to delete the file the button belongs to', async () => {
    // Arrange
    const onDelete = vi.fn();
    const target = doc('PROCESSED', 'bai.pdf');
    renderRows([target, doc('PROCESSED', 'khac.pdf')], { onDelete });

    // Act
    await userEvent.click(screen.getByLabelText('Xoá bai.pdf'));

    // Assert
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(target.id);
  });

  it('should show a file on its way up with its progress', () => {
    // Arrange, Act
    render(
      <DocumentRows
        documents={[]}
        uploading={[{
          id: 'up-1', name: 'moi.pdf', size: 1024, mediaType: 'application/pdf', progress: 42,
        }]}
        duplicates={new Set()}
        canEdit
        onDelete={vi.fn()}
      />,
    );

    // Assert
    expect(screen.getByText('moi.pdf')).toBeTruthy();
    expect(screen.getByText('Đang tải lên 42%')).toBeTruthy();
  });
});
