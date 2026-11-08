/**
 * Cách một cuộc trò chuyện hiện trong danh sách tin nhắn.
 *
 * Tách khỏi component để quy tắc thời gian, xem trước và tìm kiếm được kiểm
 * thử mà không cần render.
 */
import { formatClock } from './call-log';

import type { ChatParticipant, Conversation } from './messages-api';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/**
 * Thời gian gọn cho cột phải của một dòng: giờ nếu hôm nay, còn lại tương đối.
 *
 * @param iso thời điểm tin cuối
 * @param now thời điểm hiện tại, truyền vào để test cố định được
 */
export function formatListTime(iso: string, now: number = Date.now()): string {
  const time = Date.parse(iso);
  const diff = now - time;
  if (diff < MINUTE_MS) return 'Vừa xong';
  if (new Date(time).toDateString() === new Date(now).toDateString()) return formatClock(iso);
  const days = Math.max(1, Math.floor(diff / DAY_MS));
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày`;
  if (days < 30) return `${Math.floor(days / 7)} tuần`;
  const date = new Date(time);
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** Dòng xem trước dưới tên, hoặc lời nhắc khi chưa ai viết gì. */
export function previewOf(conversation: Conversation): string {
  return conversation.lastMessage?.trim() || 'Chưa có tin nhắn';
}

/** Những người khác trong cuộc trò chuyện, để vẽ avatar. */
export function othersOf(conversation: Conversation): ChatParticipant[] {
  return conversation.participants.filter((participant) => !participant.me);
}

/** Lọc theo tên cuộc trò chuyện hoặc tên một thành viên, không phân biệt dấu. */
export function filterConversations(
  conversations: readonly Conversation[],
  query: string,
): Conversation[] {
  const needle = normalise(query);
  if (!needle) return [...conversations];
  return conversations.filter((conversation) => {
    const names = [conversation.title, ...conversation.participants.map((p) => p.name)];
    return names.some((name) => normalise(name).includes(needle));
  });
}

/** Tổng số tin chưa đọc, cho huy hiệu trên thanh điều hướng. */
export function totalUnread(conversations: readonly Conversation[] | undefined): number {
  return (conversations ?? []).reduce((sum, conversation) => sum + conversation.unreadCount, 0);
}

function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}
