import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  awaitAttachmentSummary,
  fetchAttachmentSummary,
  requestAttachmentSummary,
} from './attachment-summary-api';
import { fetchJson } from '../../lib/api-client';

import type { PostAttachment } from './community-api';

vi.mock('../../lib/api-client', () => ({
  fetchJson: vi.fn(),
}));

const PATH = '/workspaces/ws/discussions/post/attachments/a1/summary';

function attachment(summaryState: PostAttachment['summaryState']): PostAttachment {
  return {
    id: 'a1',
    kind: 'DOCUMENT',
    originalName: 'tai-lieu.pdf',
    mediaType: 'application/pdf',
    byteSize: 1024,
    documentId: 'd1',
    aiSummary: summaryState === 'READY' ? 'Tóm tắt.' : null,
    summaryState,
  };
}

describe('attachment summary API', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('asks for a summary with a POST to the attachment summary path', async () => {
    // Arrange
    vi.mocked(fetchJson).mockResolvedValue(attachment('PENDING'));

    // Act
    await requestAttachmentSummary('ws', 'post', 'a1');

    // Assert
    expect(fetchJson).toHaveBeenCalledWith(PATH, { method: 'POST' });
  });

  it('reads the current state with a GET to the same path', async () => {
    // Arrange
    vi.mocked(fetchJson).mockResolvedValue(attachment('READY'));

    // Act
    await fetchAttachmentSummary('ws', 'post', 'a1');

    // Assert
    expect(fetchJson).toHaveBeenCalledWith(PATH);
  });

  it('waits until the summary settles', async () => {
    // Arrange
    vi.mocked(fetchJson)
      .mockResolvedValueOnce(attachment('PENDING'))
      .mockResolvedValueOnce(attachment('UNAVAILABLE'));

    // Act
    const waiting = awaitAttachmentSummary('ws', 'post', 'a1');
    await vi.advanceTimersByTimeAsync(6000);

    // Assert
    await expect(waiting).resolves.toEqual(attachment('UNAVAILABLE'));
  });

  it('gives up after the four-minute server deadline', async () => {
    // Arrange
    vi.mocked(fetchJson).mockResolvedValue(attachment('PENDING'));

    // Act
    const waiting = awaitAttachmentSummary('ws', 'post', 'a1');
    await vi.advanceTimersByTimeAsync(241_000);

    // Assert
    await expect(waiting).resolves.toBeNull();
  });

  it('stops without fetching once the reader has left', async () => {
    // Act
    const waiting = awaitAttachmentSummary('ws', 'post', 'a1', () => true);
    await vi.advanceTimersByTimeAsync(3000);

    // Assert
    await expect(waiting).resolves.toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });
});
