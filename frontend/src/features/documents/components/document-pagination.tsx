/**
 * Paging for the group's file list.
 *
 * Rendered only when there is more than one page: a bar that always reads
 * "Trang 1 / 1" is chrome reporting on itself.
 */
import './document-pagination.css';

interface DocumentPaginationProps {
  readonly currentPage: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly onPage: (page: number) => void;
  readonly onPageSize: (size: number) => void;
}

/** The sizes offered, within the 100-row maximum the API allows. */
const PAGE_SIZES = [5, 10, 20, 50] as const;

export function DocumentPagination({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  onPage,
  onPageSize,
}: DocumentPaginationProps) {
  if (totalPages <= 1) return null;

  const first = (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav className="document-pagination" aria-label="Phân trang tài liệu">
      <div className="document-pagination__info">
        <span>
          Hiển thị <strong>{first}</strong> – <strong>{last}</strong> trong tổng số{' '}
          <strong>{totalItems}</strong> tệp
        </span>
        <select
          className="document-pagination__size-select"
          value={pageSize}
          onChange={(e) => {
            onPageSize(Number(e.target.value));
            onPage(1);
          }}
          aria-label="Số dòng mỗi trang"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>{size} dòng / trang</option>
          ))}
        </select>
      </div>

      <div className="document-pagination__controls">
        <PageButton label="Trang đầu" glyph="«" disabled={currentPage === 1}
          onClick={() => onPage(1)} />
        <PageButton label="Trang trước" glyph="‹" disabled={currentPage === 1}
          onClick={() => onPage(Math.max(1, currentPage - 1))} />
        <span className="document-pagination__page-indicator">
          Trang {currentPage} / {totalPages}
        </span>
        <PageButton label="Trang sau" glyph="›" disabled={currentPage >= totalPages}
          onClick={() => onPage(Math.min(totalPages, currentPage + 1))} />
        <PageButton label="Trang cuối" glyph="»" disabled={currentPage >= totalPages}
          onClick={() => onPage(totalPages)} />
      </div>
    </nav>
  );
}

interface PageButtonProps {
  readonly label: string;
  readonly glyph: string;
  readonly disabled: boolean;
  readonly onClick: () => void;
}

/** One step through the pages; the glyph is decoration, the label is the name. */
function PageButton({ label, glyph, disabled, onClick }: PageButtonProps) {
  return (
    <button
      type="button"
      className="document-pagination__btn"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
