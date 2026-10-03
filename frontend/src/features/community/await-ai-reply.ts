/**
 * Waits for the assistant's answer to land on a thread.
 *
 * Mentioning `@AI` in a comment queues a retrieval run on the server, so the
 * answer is written seconds after the comment itself. Without this the reader
 * sees nothing until they reload the page and assumes the assistant ignored
 * them.
 */
import { fetchReplies, type ReplyResponse } from './community-api';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 30;

/** True when a comment asks the assistant to answer. */
export function mentionsAi(body: string): boolean {
  return /@ai\b/i.test(body);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polls the thread until the assistant replies to `triggerReplyId`.
 *
 * @param isCancelled called before each attempt; stops the wait when it returns
 *                    true, so a reader who navigates away is not polled after
 * @returns the assistant's reply, or null if it never arrived in time
 * @throws whatever {@link fetchReplies} throws, so the caller can tell the
 *         reader the wait failed rather than letting it look like silence
 */
export async function awaitAiReply(
  workspaceId: string,
  discussionId: string,
  triggerReplyId: string,
  isCancelled: () => boolean = () => false,
): Promise<ReplyResponse | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    await delay(POLL_INTERVAL_MS);
    if (isCancelled()) {
      return null;
    }
    const replies = await fetchReplies(workspaceId, discussionId);
    const answer = replies.find(
      (reply) => reply.isAiAnswer && reply.parentReplyId === triggerReplyId,
    );
    if (answer) {
      return answer;
    }
  }
  return null;
}
