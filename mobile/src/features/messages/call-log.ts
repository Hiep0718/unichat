/**
 * Cách một cuộc gọi được kể lại trong cuộc trò chuyện, nhìn từ phía người đọc.
 *
 * Cùng cách diễn đạt với `frontend/src/features/calls/components/call-log-entry.tsx`
 * để hai bản không kể một cuộc gọi theo hai kiểu.
 */
import type { IconName } from '../../components/uc-icon';
import type { CallHistoryEntry } from './messages-api';

/** Dòng mô tả cuộc gọi. */
export function describeCall(entry: CallHistoryEntry): string {
  if (entry.status === 'ENDED') return entry.outgoing ? 'Cuộc gọi đi' : 'Cuộc gọi đến';
  if (entry.status === 'DECLINED') return entry.outgoing ? 'Cuộc gọi bị từ chối' : 'Bạn đã từ chối';
  if (entry.status === 'FAILED') return 'Cuộc gọi lỗi kết nối';
  // MISSED gồm không ai bắt máy, người nhận offline và người nhận đang bận.
  return entry.outgoing ? 'Cuộc gọi không trả lời' : 'Cuộc gọi nhỡ';
}

/** Cuộc gọi đến bị nhỡ là thứ người đọc có thể vẫn cần xử lý. */
export function callNeedsAttention(entry: CallHistoryEntry): boolean {
  return entry.status === 'MISSED' && !entry.outgoing;
}

/** Biểu tượng đi kèm, theo chiều và kết quả. */
export function callIcon(entry: CallHistoryEntry): IconName {
  if (entry.status !== 'ENDED') return 'call-missed';
  return entry.outgoing ? 'call-made' : 'call-received';
}

/** Thời lượng nói chuyện dạng `m:ss`. */
export function formatTalkTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/** Giờ trong ngày dạng `HH:mm`, không phụ thuộc locale của máy. */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
