/**
 * Quy tắc trình bày của màn Trợ lý AI, tách khỏi React để kiểm thử riêng.
 *
 * Gồm: chia lịch sử theo mốc thời gian, xếp nhóm "dùng gần đây", chọn nhóm
 * mặc định để hỏi, và dựng gợi ý câu hỏi từ tài liệu của nhóm.
 */
import type { ConversationItem } from '../../types/api';
import type { DocumentItem, WorkspaceItem } from '../workspaces/workspace-types';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Một cuộc trò chuyện kèm nhóm của nó, vì lịch sử có thể gộp nhiều nhóm. */
export interface HistoryEntry {
  readonly conversation: ConversationItem;
  readonly workspace: WorkspaceItem;
}

export interface HistorySection {
  readonly title: string;
  readonly entries: readonly HistoryEntry[];
}

function lastActivity(conversation: ConversationItem): number {
  return Date.parse(conversation.lastMessageAt || conversation.createdAt);
}

function startOfDay(time: number): number {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysAgo(time: number, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(time)) / DAY_MS);
}

function sectionTitle(time: number, now: number): string {
  const days = daysAgo(time, now);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return 'Tuần này';
  return 'Trước đó';
}

/**
 * Lịch sử chia theo Hôm nay / Hôm qua / Tuần này / Trước đó, mới nhất trước.
 *
 * @param now thời điểm hiện tại, truyền vào để test cố định được
 */
export function groupHistory(entries: readonly HistoryEntry[], now: number = Date.now()): HistorySection[] {
  const sorted = [...entries].sort((a, b) => lastActivity(b.conversation) - lastActivity(a.conversation));
  const sections: { title: string; entries: HistoryEntry[] }[] = [];
  for (const entry of sorted) {
    const title = sectionTitle(lastActivity(entry.conversation), now);
    const last = sections[sections.length - 1];
    if (last?.title === title) last.entries.push(entry);
    else sections.push({ title, entries: [entry] });
  }
  return sections;
}

/** Nhãn thời gian của một dòng lịch sử: giờ nếu hôm nay, thứ nếu trong tuần, ngày nếu xa hơn. */
export function historyTime(iso: string, now: number = Date.now()): string {
  const time = Date.parse(iso);
  const date = new Date(time);
  const days = daysAgo(time, now);
  if (days <= 0) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (days === 1) return 'Hôm qua';
  if (days < 7) return WEEKDAYS[date.getDay()];
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/** Nhóm có tài liệu nào để hỏi không. */
export function canAsk(workspace: WorkspaceItem): boolean {
  return workspace.documentCount > 0;
}

/**
 * Chia nhóm thành "dùng gần đây" (theo cuộc trò chuyện mới nhất) và phần còn lại.
 *
 * @param limit số nhóm tối đa ở phần gần đây
 */
export function splitGroups(
  workspaces: readonly WorkspaceItem[],
  entries: readonly HistoryEntry[],
  limit = 3,
): { recent: WorkspaceItem[]; others: WorkspaceItem[] } {
  const latest = new Map<string, number>();
  for (const { conversation, workspace } of entries) {
    latest.set(workspace.id, Math.max(latest.get(workspace.id) ?? 0, lastActivity(conversation)));
  }
  const recent = workspaces
    .filter((workspace) => latest.has(workspace.id))
    .sort((a, b) => (latest.get(b.id) ?? 0) - (latest.get(a.id) ?? 0))
    .slice(0, limit);
  const recentIds = new Set(recent.map((workspace) => workspace.id));
  return { recent, others: workspaces.filter((workspace) => !recentIds.has(workspace.id)) };
}

/**
 * Nhóm mặc định để hỏi: nhóm vừa hỏi gần nhất, nếu không thì nhóm đầu tiên có
 * tài liệu, để không bao giờ lặng lẽ chọn một nhóm trống.
 */
export function defaultGroup(
  workspaces: readonly WorkspaceItem[],
  entries: readonly HistoryEntry[],
): WorkspaceItem | null {
  const { recent } = splitGroups(workspaces, entries, 1);
  return recent[0] ?? workspaces.find(canAsk) ?? workspaces[0] ?? null;
}

function documentTitle(doc: DocumentItem): string {
  return (doc.name || doc.originalFileName || '').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[_-]+/g, ' ').trim();
}

/**
 * Gợi ý câu hỏi: tóm tắt hai tài liệu đã sẵn sàng đầu tiên, rồi các câu chung.
 *
 * Chỉ dựa vào tệp trợ lý đọc được, để gợi ý không dẫn tới một câu hỏi mà tài
 * liệu chưa sẵn sàng trả lời.
 */
export function buildSuggestions(documents: readonly DocumentItem[], limit = 4): string[] {
  const fromDocs = documents
    .filter((doc) => doc.status === 'PROCESSED')
    .map(documentTitle)
    .filter((title) => title.length > 0)
    .slice(0, 2)
    .map((title) => `Tóm tắt nội dung chính của "${title}"`);
  const general = [
    'Giải thích các khái niệm quan trọng nhất trong tài liệu',
    'So sánh các phương pháp được trình bày trong tài liệu',
    'Tạo 3 câu hỏi ôn tập kèm lời giải từ tài liệu',
  ];
  return [...fromDocs, ...general].slice(0, limit);
}
