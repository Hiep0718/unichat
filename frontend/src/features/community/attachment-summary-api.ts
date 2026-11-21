/**
 * Asks for, and waits on, the assistant's summary of a post's document.
 *
 * A summary is produced when a member asks for it, as that member's own AI
 * request, and is then shown to everyone. It takes seconds to a few minutes,
 * so the caller asks once and then checks back until it settles.
 */
import { fetchJson } from '../../lib/api-client';

import type { PostAttachment } from './community-api';

const POLL_INTERVAL_MS = 3000;
/** Eighty checks three seconds apart: the server's four-minute deadline. */
const MAX_ATTEMPTS = 80;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function summaryPath(workspaceId: string, discussionId: string, attachmentId: string): string {
  return `/workspaces/${workspaceId}/discussions/${discussionId}/attachments/${attachmentId}/summary`;
}

/**
 * Asks the assistant to summarise an attachment.
 *
 * @returns the attachment: `PENDING` while the summary is produced, or `READY`
 *          when it already had one
 * @throws ApiError with the server's reason, e.g. the document is not ready
 *         yet or the member's AI quota is used up
 */
export function requestAttachmentSummary(
  workspaceId: string,
  discussionId: string,
  attachmentId: string,
): Promise<PostAttachment> {
  return fetchJson<PostAttachment>(summaryPath(workspaceId, discussionId, attachmentId), {
    method: 'POST',
  });
}

/** Reads where an attachment's summary has got. */
export function fetchAttachmentSummary(
  workspaceId: string,
  discussionId: string,
  attachmentId: string,
): Promise<PostAttachment> {
  return fetchJson<PostAttachment>(summaryPath(workspaceId, discussionId, attachmentId));
}

/**
 * Checks back until the summary is ready or known to be unavailable.
 *
 * @param isCancelled checked before each attempt, so a reader who leaves is
 *                    not polled after
 * @returns the settled attachment, or null when cancelled or out of time
 */
export async function awaitAttachmentSummary(
  workspaceId: string,
  discussionId: string,
  attachmentId: string,
  isCancelled: () => boolean = () => false,
): Promise<PostAttachment | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    await delay(POLL_INTERVAL_MS);
    if (isCancelled()) {
      return null;
    }
    const current = await fetchAttachmentSummary(workspaceId, discussionId, attachmentId);
    if (current.summaryState !== 'PENDING') {
      return current;
    }
  }
  return null;
}
