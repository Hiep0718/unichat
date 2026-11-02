/**
 * Resolution state of a question — the single most useful signal in the feed.
 *
 * A reader scanning the list wants to know whether a question still needs
 * help before anything else, so this leads every card rather than the vote
 * score. Ported from the web unchanged so both clients call the same post the
 * same thing.
 */
export type AnswerStatus = 'UNANSWERED' | 'DISCUSSING' | 'RESOLVED';

/**
 * Whether a post has a resolution state at all.
 *
 * Only a question does. A discussion is never "chưa có lời giải" — nobody
 * asked for one — and an announcement is not waiting on anybody either.
 */
export function hasResolutionState(label: string | null): boolean {
  return label === 'QUESTION';
}

/** Derives the state from the counters the feed already returns. */
export function resolveAnswerStatus(
  replyCount: number,
  hasAcceptedAnswer: boolean,
): AnswerStatus {
  if (hasAcceptedAnswer) return 'RESOLVED';
  return replyCount > 0 ? 'DISCUSSING' : 'UNANSWERED';
}

/**
 * Strips Markdown syntax so the preview line reads as plain prose.
 *
 * Without it a card shows its reader the raw `##` and backticks the author
 * typed, which is what the mobile preview used to do.
 */
export function toPlainPreview(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
