import type { WorkspaceDto } from './workspace-schema';

/** Một gợi ý mở đầu, gắn với một nhóm cụ thể. */
export interface HeroPrompt {
  readonly workspaceId: string;
  readonly label: string;
  readonly question: string;
}

/**
 * Ba cách mở đầu, mỗi cách một kiểu việc khác nhau.
 *
 * Nhãn ngắn để quét bằng mắt; câu hỏi đầy đủ mới là thứ gửi đi.
 */
const SHAPES = [
  {
    label: (name: string) => `Tóm tắt tài liệu mới trong ${name}`,
    question: (name: string) =>
      `Tóm tắt các ý chính trong tài liệu mới nhất của ${name}, kèm nguồn trích dẫn.`,
  },
  {
    label: (name: string) => `Tạo câu hỏi ôn tập ${name}`,
    question: (name: string) =>
      `Dựa trên tài liệu của ${name}, soạn một số câu hỏi ôn tập kèm nguồn trích dẫn.`,
  },
  {
    label: (name: string) => `Tra cứu ${name}`,
    question: (name: string) =>
      `Trong tài liệu của ${name}, tra cứu giúp tôi quy định liên quan và chỉ rõ nguồn.`,
  },
] as const;

/**
 * Dựng gợi ý mở đầu từ các nhóm gần đây của người dùng.
 *
 * Mỗi gợi ý trỏ vào một nhóm khác nhau, vì ba gợi ý cùng một nhóm thì chỉ là
 * một gợi ý viết ba lần. Nhóm nào cũng phải có tài liệu: mời người dùng tóm
 * tắt một kho rỗng là mời họ vào một câu trả lời "không có bằng chứng".
 *
 * @param workspaces Danh sách workspace đã tải về.
 * @param limit Số gợi ý tối đa.
 * @returns Các gợi ý, rỗng khi chưa nhóm nào có tài liệu.
 */
export function heroPrompts(
  workspaces: readonly WorkspaceDto[],
  limit = 3,
): readonly HeroPrompt[] {
  const usable = workspaces.filter((ws) => ws.documentCount > 0).slice(0, limit);

  return usable.map((ws, index) => {
    const shape = SHAPES[index % SHAPES.length]!;
    return {
      workspaceId: ws.id,
      label: shape.label(ws.name),
      question: shape.question(ws.name),
    };
  });
}
