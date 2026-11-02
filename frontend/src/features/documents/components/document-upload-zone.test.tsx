import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentUploadZone } from './document-upload-zone';

// Vitest `globals` tắt toàn dự án nên RTL không tự gắn auto-cleanup.
afterEach(cleanup);

function renderZone(options: { isUploading?: boolean; canEdit?: boolean } = {}) {
  const onFiles = vi.fn<(files: File[]) => void>();
  const view = render(
    <DocumentUploadZone
      isUploading={options.isUploading ?? false}
      uploadingCount={options.isUploading ? 2 : 0}
      canEdit={options.canEdit ?? true}
      onFiles={onFiles}
    />,
  );
  return { ...view, onFiles };
}

const aFile = () => new File(['x'], 'bai.pdf', { type: 'application/pdf' });

describe('DocumentUploadZone', () => {
  it('should invite both dropping and clicking', () => {
    // Arrange, Act
    renderZone();

    // Assert
    expect(screen.getByText('Kéo thả hoặc bấm để tải tệp lên')).toBeTruthy();
  });

  it('should say what the pipeline accepts to someone whose files go straight in', () => {
    // Arrange, Act
    renderZone({ canEdit: true });

    // Assert
    expect(screen.getByText(/PDF trên 20 MB sẽ được tự chia nhỏ/)).toBeTruthy();
  });

  it('should tell a contributor their file waits for approval first', () => {
    // Arrange, Act: an editor needs to know the limits; a contributor needs to
    // know the file is not a source yet.
    renderZone({ canEdit: false });

    // Assert
    expect(screen.getByText(/chờ chủ nhóm duyệt/)).toBeTruthy();
    expect(screen.queryByText(/chia nhỏ/)).toBeNull();
  });

  it('should hand dropped files to the caller', () => {
    // Arrange
    const { onFiles } = renderZone();
    const zone = screen.getByLabelText('Tải tệp lên');

    // Act
    fireEvent.drop(zone, { dataTransfer: { files: [aFile()] } });

    // Assert
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0]?.[0]).toHaveLength(1);
  });

  it('should ignore a drop carrying nothing', () => {
    // Arrange
    const { onFiles } = renderZone();

    // Act
    fireEvent.drop(screen.getByLabelText('Tải tệp lên'), { dataTransfer: { files: [] } });

    // Assert
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('should refuse more files while the current ones are still going up', () => {
    // Arrange
    const { onFiles } = renderZone({ isUploading: true });

    // Act
    fireEvent.drop(screen.getByLabelText('Tải tệp lên'), { dataTransfer: { files: [aFile()] } });

    // Assert
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText('Đang tải lên 2 tệp...')).toBeTruthy();
  });

  it('should be reachable from the keyboard, and not while busy', async () => {
    // Arrange, Act, Assert: a div that only answers the mouse is a control
    // nobody on a keyboard can use.
    const { unmount } = renderZone();
    expect(screen.getByLabelText('Tải tệp lên').getAttribute('tabindex')).toBe('0');
    unmount();

    renderZone({ isUploading: true });
    const busy = screen.getByLabelText('Tải tệp lên');
    expect(busy.getAttribute('tabindex')).toBe('-1');
    expect(busy.getAttribute('aria-disabled')).toBe('true');
    await userEvent.tab();
  });
});
