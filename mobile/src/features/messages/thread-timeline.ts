/**
 * Dựng dòng thời gian của một cuộc trò chuyện từ tin nhắn và cuộc gọi.
 *
 * Hàm thuần, không đụng tới React, để toàn bộ quy tắc trình bày (mốc ngày,
 * gộp cuộc gọi liên tiếp, avatar ở cuối chuỗi, "Đã gửi") kiểm thử được riêng.
 */
import { describeCall } from './call-log';

import type { CallHistoryEntry, DirectMessage } from './messages-api';

const DAY_MS = 86_400_000;

export interface DayItem {
  readonly kind: 'day';
  readonly key: string;
  readonly label: string;
}

export interface MessageItem {
  readonly kind: 'message';
  readonly key: string;
  readonly message: DirectMessage;
  /** Avatar chỉ hiện ở tin cuối của một chuỗi cùng người gửi. */
  readonly showAvatar: boolean;
  /** Tin cuối cùng của cuộc trò chuyện và do mình gửi. */
  readonly showSent: boolean;
}

export interface CallsItem {
  readonly kind: 'calls';
  readonly key: string;
  /** Các cuộc gọi liền nhau cùng kiểu, cũ trước. */
  readonly entries: readonly CallHistoryEntry[];
}

export type TimelineItem = DayItem | MessageItem | CallsItem;

type Entry =
  | { readonly at: number; readonly message: DirectMessage; readonly call: null }
  | { readonly at: number; readonly message: null; readonly call: CallHistoryEntry };

/**
 * Hợp hai danh sách tin, bỏ trùng theo id, mới nhất trước.
 *
 * Một tin mình vừa gửi về hai lần: một từ phản hồi của lời gọi gửi, một từ
 * socket. Hợp theo id thì thứ tự về không quan trọng.
 */
export function mergeMessages(
  existing: readonly DirectMessage[],
  incoming: readonly DirectMessage[],
): DirectMessage[] {
  const byId = new Map<string, DirectMessage>();
  [...existing, ...incoming].forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function startOfDay(time: number): number {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Nhãn của một mốc ngày: gần thì kể tương đối, xa hơn một tháng thì ghi ngày.
 *
 * @param time thời điểm cần gắn nhãn, mili giây
 * @param now thời điểm hiện tại, truyền vào để test cố định được
 */
export function dayLabel(time: number, now: number): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  const date = new Date(time);
  const base = `${date.getDate()} tháng ${date.getMonth() + 1}`;
  return date.getFullYear() === new Date(now).getFullYear() ? base : `${base}, ${date.getFullYear()}`;
}

function mergeByTime(
  messages: readonly DirectMessage[],
  calls: readonly CallHistoryEntry[],
): Entry[] {
  const entries: Entry[] = [
    ...messages.map((message) => ({ at: Date.parse(message.createdAt), message, call: null })),
    ...calls.map((call) => ({ at: Date.parse(call.startedAt), message: null, call })),
  ];
  return entries.sort((a, b) => a.at - b.at);
}

/** Gộp các cuộc gọi liền nhau cùng mô tả thành một dòng "3 cuộc gọi nhỡ". */
function groupCalls(entries: readonly Entry[]): Array<Entry | CallHistoryEntry[]> {
  const out: Array<Entry | CallHistoryEntry[]> = [];
  for (const entry of entries) {
    const last = out[out.length - 1];
    const joinable = entry.call && Array.isArray(last)
      && describeCall(last[0]) === describeCall(entry.call);
    if (joinable) (last as CallHistoryEntry[]).push(entry.call as CallHistoryEntry);
    else out.push(entry.call ? [entry.call] : entry);
  }
  return out;
}

function timeOf(group: Entry | CallHistoryEntry[]): number {
  return Array.isArray(group) ? Date.parse(group[0].startedAt) : group.at;
}

function senderOf(group: Entry | CallHistoryEntry[] | undefined): string | null {
  return group && !Array.isArray(group) && group.message ? group.message.senderId : null;
}

/**
 * @param runEnds tin kế tiếp thuộc người khác, hoặc nằm sau một mốc ngày mới
 */
function toItem(
  group: Entry | CallHistoryEntry[],
  runEnds: boolean,
  isLast: boolean,
): MessageItem | CallsItem {
  if (Array.isArray(group)) return { kind: 'calls', key: `calls-${group[0].id}`, entries: group };
  const message = group.message as DirectMessage;
  return {
    kind: 'message',
    key: `message-${message.id}`,
    message,
    showAvatar: runEnds,
    showSent: isLast && message.mine,
  };
}

/**
 * Dòng thời gian theo thứ tự đọc, cũ trước.
 *
 * Mốc ngày chỉ chèn khi nhãn đổi, nên hai ngày cùng rơi vào "3 tuần trước"
 * không sinh ra hai mốc giống hệt nhau.
 */
export function buildTimeline(
  messages: readonly DirectMessage[],
  calls: readonly CallHistoryEntry[],
  now: number = Date.now(),
): TimelineItem[] {
  const groups = groupCalls(mergeByTime(messages, calls));
  const labels = groups.map((group) => dayLabel(timeOf(group), now));
  const items: TimelineItem[] = [];
  groups.forEach((group, index) => {
    if (labels[index] !== labels[index - 1]) {
      items.push({ kind: 'day', key: `day-${timeOf(group)}`, label: labels[index] });
    }
    const next = groups[index + 1];
    const runEnds = labels[index + 1] !== labels[index] || senderOf(next) !== senderOf(group);
    items.push(toItem(group, runEnds, index === groups.length - 1));
  });
  return items;
}
