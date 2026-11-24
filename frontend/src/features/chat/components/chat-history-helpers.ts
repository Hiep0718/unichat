import type { ConversationItem } from '../../history/conversation-api';

export interface ConversationGroup {
  readonly label: string;
  readonly items: readonly ConversationItem[];
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/** Filters workspace conversations by Vietnamese accent-insensitive title match. */
export function filterConversations(
  items: readonly ConversationItem[],
  query: string,
): ConversationItem[] {
  const needle = normalizeSearchText(query);
  if (!needle) return [...items];
  return items.filter((item) => {
    const title = normalizeSearchText(item.title || 'Cuộc hội thoại chưa đặt tên');
    return title.includes(needle);
  });
}

function dayDifference(date: Date, reference: Date): number {
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfRef = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  return Math.floor((startOfRef.getTime() - startOfDate.getTime()) / 86_400_000);
}

function bucketLabel(isoDate: string, now: Date): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'Trước đó';
  const days = dayDifference(parsed, now);
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days <= 7) return '7 ngày qua';
  return 'Trước đó';
}

/** Groups conversations into chronological Vietnamese date sections while preserving order. */
export function groupConversationsByDate(
  items: readonly ConversationItem[],
  now: Date = new Date(),
): ConversationGroup[] {
  const buckets = new Map<string, ConversationItem[]>();
  for (const item of items) {
    const label = bucketLabel(item.updatedAt || item.createdAt, now);
    const group = buckets.get(label);
    if (group) group.push(item);
    else buckets.set(label, [item]);
  }
  return Array.from(buckets, ([label, grouped]) => ({ label, items: grouped }));
}

/** Formats a compact Vietnamese timestamp suitable for the history popover row. */
export function formatConversationTime(isoDate: string, now: Date = new Date()): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '';
  const days = dayDifference(parsed, now);
  const hhmm = parsed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (days <= 0) return hhmm;
  if (days === 1) return `Hôm qua · ${hhmm}`;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const ddmm = `${day}/${month}`;
  return parsed.getFullYear() === now.getFullYear()
    ? ddmm
    : `${ddmm}/${parsed.getFullYear()}`;
}

