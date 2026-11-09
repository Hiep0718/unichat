/**
 * Dựng cây bình luận từ danh sách phẳng máy chủ trả về.
 *
 * Kết quả là một danh sách phẳng có độ sâu, để FlatList vẽ được mà không phải
 * đệ quy component. Độ thụt được chặn ở {@link MAX_INDENT}: trên màn hẹp, một
 * chuỗi trả lời sâu mười tầng sẽ ép chữ thành một cột vài ký tự.
 */
import type { ReplyItem } from './feed-types';

export const MAX_INDENT = 3;

export interface ReplyRow {
  readonly reply: ReplyItem;
  /** Độ thụt khi vẽ, đã chặn ở {@link MAX_INDENT}. */
  readonly indent: number;
  /** Tên người được trả lời, khi bình luận nằm sâu hơn mức thụt cho phép. */
  readonly replyingTo: string | null;
}

function groupByParent(replies: readonly ReplyItem[]): Map<string | null, ReplyItem[]> {
  const known = new Set(replies.map((reply) => reply.id));
  const byParent = new Map<string | null, ReplyItem[]>();
  for (const reply of replies) {
    // Cha đã bị xoá thì đưa con lên gốc, thay vì để nó biến mất khỏi cây.
    const parent = reply.parentReplyId && known.has(reply.parentReplyId) ? reply.parentReplyId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), reply]);
  }
  byParent.forEach((list) => list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)));
  return byParent;
}

/**
 * Thứ tự đọc: mỗi bình luận gốc, theo sau là toàn bộ nhánh trả lời của nó.
 *
 * @param replies danh sách phẳng, thứ tự bất kỳ
 */
export function buildReplyRows(replies: readonly ReplyItem[]): ReplyRow[] {
  const byParent = groupByParent(replies);
  const rows: ReplyRow[] = [];
  const visit = (parent: ReplyItem | null, depth: number) => {
    for (const reply of byParent.get(parent?.id ?? null) ?? []) {
      const tooDeep = depth > MAX_INDENT;
      rows.push({
        reply,
        indent: Math.min(depth, MAX_INDENT),
        replyingTo: tooDeep && parent ? parent.authorName : null,
      });
      visit(reply, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}
