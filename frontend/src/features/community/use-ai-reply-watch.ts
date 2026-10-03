/**
 * Tracks the assistant's pending answer to a comment.
 *
 * Kept out of the page so the page renders the thread and this owns the one
 * piece of state the wait needs: whether an answer is still coming.
 */
import { useEffect, useRef, useState } from 'react';

import { awaitAiReply } from './await-ai-reply';
import type { ReplyResponse } from './community-api';

interface AiReplyWatch {
  /** True while the assistant's answer is still being waited for. */
  readonly pending: boolean;
  /** Set when the wait failed or timed out; null otherwise. */
  readonly error: string | null;
  /** Starts waiting for an answer to the comment that mentioned the assistant. */
  readonly watch: (triggerReplyId: string) => void;
}

/**
 * @param onAnswer called once with the assistant's reply when it arrives
 */
export function useAiReplyWatch(
  workspaceId: string | null,
  discussionId: string | undefined,
  onAnswer: (reply: ReplyResponse) => void,
): AiReplyWatch {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The poll outlives the render that started it, so it reads its stop signal
  // from a ref rather than from a captured value.
  const leftPage = useRef(false);

  useEffect(() => () => {
    leftPage.current = true;
  }, []);

  const watch = (triggerReplyId: string) => {
    if (!workspaceId || !discussionId) {
      return;
    }
    setPending(true);
    setError(null);
    awaitAiReply(workspaceId, discussionId, triggerReplyId, () => leftPage.current)
      .then((answer) => {
        if (answer) {
          onAnswer(answer);
          return;
        }
        setError('Trợ lý chưa trả lời. Hãy tải lại trang sau ít phút.');
      })
      .catch(() => setError('Không kiểm tra được câu trả lời của trợ lý.'))
      .finally(() => setPending(false));
  };

  return { pending, error, watch };
}
