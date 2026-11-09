/**
 * Đường dẫn giữa các màn của Trợ lý AI.
 */

/** Màn chat mới của một nhóm, kèm câu hỏi để gửi ngay khi mở nếu có. */
export function newChatPath(workspaceId: string, question?: string): string {
  const base = `/workspace/${workspaceId}/chat`;
  return question ? `${base}?q=${encodeURIComponent(question)}` : base;
}

/** Một cuộc trò chuyện đã có. */
export function conversationPath(workspaceId: string, conversationId: string): string {
  return `/workspace/${workspaceId}/chat/${conversationId}`;
}
