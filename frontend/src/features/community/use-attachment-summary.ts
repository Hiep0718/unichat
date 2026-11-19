/**
 * Owns one attachment's summary request: asking, waiting and reporting why it
 * failed, so the component only decides what to show.
 */
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../lib/api-client';
import { awaitAttachmentSummary, requestAttachmentSummary } from './attachment-summary-api';

import type { PostAttachment } from './community-api';

interface AttachmentSummaryRequest {
  /** The latest known state: the server's answer once asked, the prop before. */
  readonly attachment: PostAttachment;
  /** True from the click until the summary settles. */
  readonly generating: boolean;
  /** Why the last request failed, in the server's words when it gave some. */
  readonly error: string | null;
  /** Asks the assistant to summarise the attachment. */
  readonly request: () => void;
}

/**
 * @param attachment the attachment as the post returned it
 */
export function useAttachmentSummary(
  workspaceId: string,
  discussionId: string,
  attachment: PostAttachment,
): AttachmentSummaryRequest {
  const [latest, setLatest] = useState<PostAttachment | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leftPage = useRef(false);

  // Reset on every mount: StrictMode rehearses an unmount on the same refs.
  useEffect(() => {
    leftPage.current = false;
    return () => {
      leftPage.current = true;
    };
  }, []);

  const run = async () => {
    const started = await requestAttachmentSummary(workspaceId, discussionId, attachment.id);
    setLatest(started);
    if (started.summaryState !== 'PENDING') {
      return;
    }
    const settled = await awaitAttachmentSummary(
      workspaceId,
      discussionId,
      attachment.id,
      () => leftPage.current,
    );
    if (settled) {
      setLatest(settled);
    } else if (!leftPage.current) {
      setError('Trợ lý chưa tóm tắt xong. Hãy tải lại trang sau ít phút.');
    }
  };

  const request = () => {
    setError(null);
    setGenerating(true);
    run()
      .catch((failure: unknown) =>
        setError(failure instanceof ApiError ? failure.message : 'Không gửi được yêu cầu tóm tắt.'))
      .finally(() => setGenerating(false));
  };

  return { attachment: latest ?? attachment, generating, error, request };
}
