/**
 * Cách một bài viết được trình bày: chữ và màu cho từng trạng thái, từng nhãn.
 *
 * Tách khỏi component vẽ nó vì đây là dữ liệu thuần và vài hàm thuần: thẻ bài
 * viết vốn đã dài hơn mức dự án cho phép, mà những bảng này thì không cần nhìn
 * thấy gì để đúng.
 */
import { workplace } from '../../design/tokens';

import type { AnswerStatus } from './answer-status';
import type { ReactionType } from './feed-types';

/** Câu hỏi đã được giải quyết tới đâu. */
export const STATUS_TEXT: Record<AnswerStatus, string> = {
  UNANSWERED: 'Chưa có lời giải',
  DISCUSSING: 'Đang thảo luận',
  RESOLVED: 'Đã giải đáp',
};

/** Bài này là loại gì. */
export const LABEL_TEXT: Record<string, string> = {
  QUESTION: 'Câu hỏi',
  DISCUSSION: 'Thảo luận',
  ANNOUNCEMENT: 'Thông báo',
};

const REACTION_EMOJI: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  CARE: '🥰',
  HAHA: '😆',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
};

export const STATUS_BG: Record<AnswerStatus, string> = {
  RESOLVED: workplace.okBg,
  DISCUSSING: workplace.warnBg,
  UNANSWERED: workplace.accentSoft,
};

export const STATUS_INK: Record<AnswerStatus, string> = {
  RESOLVED: workplace.okInk,
  DISCUSSING: workplace.warnInk,
  UNANSWERED: workplace.accent,
};

/**
 * Những biểu cảm thật sự đã được để lại trên một bài, nhiều nhất trước.
 *
 * @param counts số lượt theo từng loại biểu cảm
 * @returns tối đa ba ký tự biểu cảm; mảng rỗng khi chưa ai thả gì
 */
export function usedReactions(counts: Partial<Record<ReactionType, number>>): string[] {
  return (Object.entries(counts) as [ReactionType, number][])
    .filter(([, n]) => n > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([type]) => REACTION_EMOJI[type]);
}
