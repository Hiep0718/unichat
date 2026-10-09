import { describe, expect, it } from 'vitest';

import {
  MAX_CHAT_FILES,
  MAX_CHAT_TOTAL_BYTES,
  describeFileRejection,
} from './work-chat-api';

/** A file that reports a size without allocating it. */
function fileOf(name: string, type: string, size = 12): File {
  const file = new File(['noi dung'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('describeFileRejection', () => {
  it('should accept a batch within every limit', () => {
    // Arrange
    const batch = [fileOf('anh.png', 'image/png'), fileOf('bao-cao.pdf', 'application/pdf')];

    // Act and Assert
    expect(describeFileRejection(batch)).toBeNull();
  });

  it('should accept an empty batch, since text alone is a valid message', () => {
    // Act and Assert
    expect(describeFileRejection([])).toBeNull();
  });

  it('should refuse more files than one message may carry', () => {
    // Arrange
    const batch = Array.from({ length: MAX_CHAT_FILES + 1 }, (_, index) =>
      fileOf(`anh-${index}.png`, 'image/png'),
    );

    // Act and Assert
    expect(describeFileRejection(batch)).toMatch(/tối đa 5 tệp/);
  });

  it('should refuse a format that is not on the allowlist, naming the file', () => {
    // Arrange: an SVG can run script, which is why the rule names formats
    // rather than excluding known-bad ones.
    const batch = [fileOf('anh.svg', 'image/svg+xml')];

    // Act
    const rejection = describeFileRejection(batch);

    // Assert
    expect(rejection).toMatch(/anh\.svg/);
    expect(rejection).toMatch(/Không hỗ trợ định dạng/);
  });

  it('should refuse a batch over the total size limit rather than each file', () => {
    // Arrange: two files that each fit but together do not, because the server
    // caps the whole request.
    const half = MAX_CHAT_TOTAL_BYTES / 2 + 1;
    const batch = [fileOf('a.png', 'image/png', half), fileOf('b.png', 'image/png', half)];

    // Act and Assert
    expect(describeFileRejection(batch)).toMatch(/vượt quá 20 MiB/);
  });

  it('should accept a single file right up to the limit', () => {
    // Arrange
    const batch = [fileOf('a.pdf', 'application/pdf', MAX_CHAT_TOTAL_BYTES)];

    // Act and Assert
    expect(describeFileRejection(batch)).toBeNull();
  });
});
