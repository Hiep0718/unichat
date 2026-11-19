/**
 * Waits for the assistant's answer to land on a thread.
 *
 * Mentioning `@AI` in a comment queues a retrieval run on the server, so the
 * answer is written seconds after the comment itself. Without this the reader
 * sees nothing until they reload the page and assumes the assistant ignored
 * them.
 */
import { fetchReplies, type ReplyResponse } from './community-api';

/** Quick checks while an answer is most likely to arrive. */
const FAST_INTERVAL_MS = 2000;
const FAST_ATTEMPTS = 30;
/** Slower checks after that, up to the server's four-minute answer deadline. */
const SLOW_INTERVAL_MS = 5000;
const SLOW_ATTEMPTS = 36;

/**
 * Same rule as the server: the handle must stand alone, so an address such as
 * `x@ai.edu.vn` or a name such as `@aiden` does not call the assistant.
 * Written without lookbehind so older engines parse it too.
 */
const AI_HANDLE = /(^|[^\w.@])@ai\b(?!\.\w)/i;

/** True when a comment asks the assistant to answer. */
export function mentionsAi(body: string): boolean {
  return AI_HANDLE.test(body);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Two seconds apart for the first minute, then every five seconds. */
function intervalFor(attempt: number): number {
  return attempt < FAST_ATTEMPTS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
}

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
  for (let attempt = 0; attempt < FAST_ATTEMPTS + SLOW_ATTEMPTS; attempt += 1) {
    await delay(intervalFor(attempt));
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
