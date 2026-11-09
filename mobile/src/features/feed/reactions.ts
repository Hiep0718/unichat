/**
 * Bộ cảm xúc và thứ tự hiển thị, khớp `ReactionSummary.displayOrder` ở máy
 * chủ và thanh cảm xúc của web.
 */
import type { ReactionSummary, ReactionType } from './feed-types';

export interface ReactionOption {
  readonly type: ReactionType;
  readonly emoji: string;
  readonly label: string;
}

export const REACTIONS: readonly ReactionOption[] = [
  { type: 'LIKE', emoji: '👍', label: 'Thích' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích' },
  { type: 'CARE', emoji: '🥰', label: 'Thương thương' },
  { type: 'HAHA', emoji: '😆', label: 'Haha' },
  { type: 'WOW', emoji: '😮', label: 'Wow' },
  { type: 'SAD', emoji: '😢', label: 'Buồn' },
  { type: 'ANGRY', emoji: '😠', label: 'Phẫn nộ' },
];

export const REACTION_EMOJI = Object.fromEntries(
  REACTIONS.map((reaction) => [reaction.type, reaction.emoji]),
) as Record<ReactionType, string>;

/** Bản tổng hợp rỗng, cho bài hoặc bình luận máy chủ chưa gửi kèm. */
export const EMPTY_REACTIONS: ReactionSummary = { counts: {}, total: 0, myReaction: null };

/** Nhãn của một loại cảm xúc. */
export function reactionLabel(type: ReactionType): string {
  return REACTIONS.find((reaction) => reaction.type === type)?.label ?? type;
}
