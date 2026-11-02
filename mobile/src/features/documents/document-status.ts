/**
 * Điều mà trạng thái của một tài liệu nói với người đang đọc danh sách.
 *
 * Trước đây màn Tệp so khớp trạng thái `'COMPLETED'` — một giá trị **Core API
 * chưa bao giờ gửi**; nó gửi `PROCESSED`. Nên mọi tệp đã xử lý xong đều rơi vào
 * nhánh mặc định và hiện "Đang chờ": tệp đã sẵn sàng lại đọc ra là còn phải đợi.
 * Mỗi trạng thái ở đây giữ câu trả lời riêng của nó — tệp lỗi không phải tệp
 * đang chạy, và bảo người ta chờ một thứ đã dừng là nói sai.
 */
import type { DocumentItem, DocumentStatus } from '../workspaces/workspace-types';

/** Cách một trạng thái nên đọc: xong, đang chạy, hay cần để mắt tới. */
export type StatusTone = 'ready' | 'working' | 'blocked';

export interface StatusPresentation {
  readonly label: string;
  readonly tone: StatusTone;
}

const PRESENTATION: Record<DocumentStatus, StatusPresentation> = {
  PROCESSED: { label: 'Sẵn sàng cho AI', tone: 'ready' },
  PROCESSING: { label: 'Đang xử lý', tone: 'working' },
  PENDING: { label: 'Chờ xử lý', tone: 'working' },
  DELETING: { label: 'Đang xoá', tone: 'working' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', tone: 'working' },
  FAILED: { label: 'Lỗi xử lý', tone: 'blocked' },
  REJECTED: { label: 'Bị từ chối', tone: 'blocked' },
};

/** Trạng thái client chưa được dạy, hiện ra như chính nó chứ không giấu đi. */
const UNKNOWN: StatusPresentation = { label: 'Không rõ', tone: 'blocked' };

/**
 * Nhãn và sắc thái cho trạng thái của một tệp.
 *
 * @param status trạng thái đúng như Core API báo về
 * @returns cách hiển thị; một trạng thái lạ đọc ra "Không rõ" chứ không bị âm
 *          thầm coi như đã sẵn sàng
 */
export function presentStatus(status: DocumentStatus): StatusPresentation {
  return PRESENTATION[status] ?? UNKNOWN;
}

/** Trợ lý có đọc được tệp này ngay lúc này hay không. */
export function isReadyForAssistant(status: DocumentStatus): boolean {
  return status === 'PROCESSED';
}

/**
 * Bao nhiêu tệp của nhóm là thứ trợ lý thật sự đọc được.
 *
 * <p>Đếm ở đây chứ không hỏi server: danh sách vốn đã nạp rồi, và một tệp còn
 * đang được nạp vào kho vector thì trợ lý chưa dùng tới được, nên con số tổng
 * sẽ nói quá những gì nó biết.
 *
 * @param documents các tệp của nhóm như đang nạp được
 * @returns số đã sẵn sàng và tổng số, cả hai bằng 0 với danh sách rỗng
 */
export function countReady(documents: readonly DocumentItem[]): {
  readonly ready: number;
  readonly total: number;
} {
  const ready = documents.filter((doc) => isReadyForAssistant(doc.status)).length;
  return { ready, total: documents.length };
}

/**
 * Những cái tên mà nhiều hơn một tệp trong nhóm cùng mang.
 *
 * <p>Hai tệp trùng tên không phải lỗi — tải lại là chuyện bình thường — nhưng
 * người đang chọn xoá cái nào thì không phân biệt được, nên dòng tệp phải nói
 * ra tên nào đang bị dùng chung.
 *
 * @param documents các tệp của nhóm như đang nạp được
 * @returns các tên bị trùng, so sánh không phân biệt hoa thường sau khi cắt
 *          khoảng trắng hai đầu
 */
export function duplicatedNames(documents: readonly DocumentItem[]): ReadonlySet<string> {
  const seen = new Map<string, number>();
  for (const doc of documents) {
    const key = doc.name.trim().toLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }

  const repeated = new Set<string>();
  for (const [key, count] of seen) {
    if (count > 1) repeated.add(key);
  }
  return repeated;
}

/** Tên của tệp này có phải cái tên mà một tệp khác cũng dùng hay không. */
export function isDuplicatedName(name: string, duplicates: ReadonlySet<string>): boolean {
  return duplicates.has(name.trim().toLowerCase());
}

/**
 * Loại tệp hiển thị cạnh tên, ví dụ "PDF".
 *
 * @param mediaType kiểu MIME mà server báo về
 * @returns phần sau dấu gạch chéo viết hoa, hoặc cả chuỗi khi không có phần đó
 */
export function fileKind(mediaType: string): string {
  const subtype = mediaType.split('/')[1];
  if (!subtype) return mediaType.toUpperCase();
  // "vnd.openxmlformats-officedocument.wordprocessingml.document" không nói
  // DOCX với ai cả; phần sau dấu chấm cuối mới là thứ người đọc nhận ra.
  const tail = subtype.split('.').pop() ?? subtype;
  if (tail === 'document') return 'DOCX';
  if (tail === 'plain') return 'TXT';
  return tail.toUpperCase();
}
