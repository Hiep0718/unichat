/**
 * Pure rules for laying out a comment thread, kept apart from the components
 * so they can be tested without rendering anything.
 */
import type { ReplyResponse } from './community-api';

/** Replies grouped by the reply they answer; `null` holds the top level. */
export type RepliesByParent = ReadonlyMap<string | null, readonly ReplyResponse[]>;

/**
 * The sentence `AiReplyService` posts when the assistant could not answer.
 *
 * Matched by prefix because the server owns the wording. If it changes there,
 * the only consequence is that the failure is drawn as an ordinary reply
 * again — nothing breaks.
 */
const ASSISTANT_FALLBACK_PREFIX = 'Trợ lý chưa trả lời được';

/**
 * Whether this reply is the assistant saying it could not answer, rather than
 * an answer.
 *
 * Such a reply carries no content and no citations; drawing it as a full
 * comment from the assistant made a failure look like a contribution.
 */
export function isAssistantFallback(reply: ReplyResponse): boolean {
  return reply.isAiAnswer && reply.body.trim().startsWith(ASSISTANT_FALLBACK_PREFIX);
}

/** Groups replies by parent, keeping each group in the order given. */
export function groupByParent(replies: readonly ReplyResponse[]): Map<string | null, ReplyResponse[]> {
  const map = new Map<string | null, ReplyResponse[]>();
  for (const reply of replies) {
    const key = reply.parentReplyId;
    map.set(key, [...(map.get(key) ?? []), reply]);
  }
  return map;
}

/**
 * Puts the accepted answer's thread first, leaving the rest in time order.
 *
 * Only a top-level accepted reply moves. A nested one stays inside the
 * conversation it answers, where it still carries its own highlight, because
 * lifting a reply out of its thread loses what it was replying to.
 */
export function orderRoots(
  roots: readonly ReplyResponse[],
  acceptedReplyId: string | null | undefined,
): readonly ReplyResponse[] {
  const accepted = roots.find((reply) => reply.id === acceptedReplyId);
  if (!accepted) return roots;
  return [accepted, ...roots.filter((reply) => reply !== accepted)];
}

/** How many replies a thread holds, counting its root and every descendant. */
export function threadSize(replyId: string, byParent: RepliesByParent): number {
  const children = byParent.get(replyId) ?? [];
  return 1 + children.reduce((sum, child) => sum + threadSize(child.id, byParent), 0);
}

/** How many replies the collapsed view leaves out, across the hidden threads. */
export function hiddenCount(hidden: readonly ReplyResponse[], byParent: RepliesByParent): number {
  return hidden.reduce((sum, root) => sum + threadSize(root.id, byParent), 0);
}
