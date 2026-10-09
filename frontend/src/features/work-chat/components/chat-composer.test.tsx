import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatComposer } from './chat-composer';
import { ApiError } from '../../../lib/api-client';

// Vitest `globals` is disabled project-wide, so RTL auto-cleanup is not installed.
afterEach(cleanup);

/** A file that reports a size without allocating it. */
function fileOf(name: string, type: string, size = 12): File {
  const file = new File(['noi dung'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

/**
 * Drops files on the composer.
 *
 * Used instead of the file input for the rejection cases: the input carries an
 * `accept` list that user-event honours, so a disallowed file would never reach
 * the handler being tested. A drag-and-drop has no such filter, which is
 * exactly why the composer has to check for itself.
 */
function dropOnComposer(files: readonly File[]) {
  const form = screen.getByLabelText('Nội dung tin nhắn').closest('form');
  fireEvent.drop(form as HTMLElement, { dataTransfer: { files } });
}

describe('ChatComposer', () => {
  it('should send the text that was typed, with no files', async () => {
    // Arrange
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ChatComposer onSend={onSend} />);

    // Act
    await userEvent.type(screen.getByLabelText('Nội dung tin nhắn'), 'xin chào');
    await userEvent.click(screen.getByLabelText('Gửi'));

    // Assert
    expect(onSend).toHaveBeenCalledWith('xin chào', [], expect.any(Function));
  });

  it('should let a file be sent with no text at all', async () => {
    // Arrange
    const onSend = vi.fn().mockResolvedValue(undefined);
    const image = fileOf('anh.png', 'image/png');
    render(<ChatComposer onSend={onSend} />);

    // Act
    await userEvent.upload(screen.getByLabelText('Chọn tệp để gửi'), image);

    // Assert: a message that is only a file is a message.
    expect(screen.getByLabelText('Gửi')).toBeEnabled();
    await userEvent.click(screen.getByLabelText('Gửi'));
    expect(onSend).toHaveBeenCalledWith('', [image], expect.any(Function));
  });

  it('should keep the send button disabled while there is nothing to send', () => {
    // Arrange and Act
    render(<ChatComposer onSend={vi.fn()} />);

    // Assert
    expect(screen.getByLabelText('Gửi')).toBeDisabled();
  });

  it('should refuse an unsupported format before anything is uploaded', () => {
    // Arrange
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} />);

    // Act
    dropOnComposer([fileOf('anh.svg', 'image/svg+xml')]);

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent(/anh\.svg/);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('should refuse the whole batch when it is over the size limit', () => {
    // Arrange
    render(<ChatComposer onSend={vi.fn()} />);
    const big = fileOf('a.png', 'image/png', 11 * 1024 * 1024);

    // Act
    dropOnComposer([big, fileOf('b.png', 'image/png', 11 * 1024 * 1024)]);

    // Assert: nothing is attached, rather than the first file alone.
    expect(screen.getByRole('alert')).toHaveTextContent(/vượt quá 20 MiB/);
    expect(screen.queryByText(big.name)).not.toBeInTheDocument();
  });

  it('should let a chosen file be dropped again before sending', async () => {
    // Arrange
    render(<ChatComposer onSend={vi.fn()} />);
    await userEvent.upload(
      screen.getByLabelText('Chọn tệp để gửi'),
      fileOf('bao-cao.pdf', 'application/pdf'),
    );

    // Act
    await userEvent.click(screen.getByLabelText('Bỏ bao-cao.pdf'));

    // Assert
    expect(screen.queryByText('bao-cao.pdf')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Gửi')).toBeDisabled();
  });

  it('should keep the draft and its files when the send fails', async () => {
    // Arrange
    const onSend = vi.fn().mockRejectedValue(new ApiError(413, 'Tệp vượt quá 20 MiB'));
    render(<ChatComposer onSend={onSend} />);
    await userEvent.upload(
      screen.getByLabelText('Chọn tệp để gửi'),
      fileOf('anh.png', 'image/png'),
    );
    const input = screen.getByLabelText('Nội dung tin nhắn');
    await userEvent.type(input, 'xem ảnh này');

    // Act
    await userEvent.click(screen.getByLabelText('Gửi'));

    // Assert: the reason comes from the server, and nothing typed is lost.
    expect(await screen.findByRole('alert')).toHaveTextContent('Tệp vượt quá 20 MiB');
    expect(input).toHaveValue('xem ảnh này');
    expect(screen.getByText('anh.png')).toBeInTheDocument();
  });

  it('should not show the reader an unexpected failure verbatim', async () => {
    // Arrange: only a reason that came from the API is fit to show.
    const onSend = vi.fn().mockRejectedValue(new Error('Cannot read properties of undefined'));
    render(<ChatComposer onSend={onSend} />);
    await userEvent.type(screen.getByLabelText('Nội dung tin nhắn'), 'xin chào');

    // Act
    await userEvent.click(screen.getByLabelText('Gửi'));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Không gửi được. Thử lại nhé.');
  });
});
