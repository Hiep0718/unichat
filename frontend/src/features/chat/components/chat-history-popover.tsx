import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  deleteWorkspaceConversation,
  fetchWorkspaceConversations,
} from '../../history/conversation-api';
import {
  filterConversations,
  formatConversationTime,
  groupConversationsByDate,
} from './chat-history-helpers';
import type { ConversationGroup } from './chat-history-helpers';
import type { ConversationItem } from '../../history/conversation-api';
import './chat-history-popover.css';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export interface ChatHistoryPopoverProps {
  readonly workspaceId: string;
  readonly workspaceName?: string | undefined;
  readonly activeConversationId?: string | undefined;
  readonly onSelectConversation: (conversationId: string) => void;
  readonly onNewChat: () => void;
  readonly onDeletedActive?: (() => void) | undefined;
}

interface HistoryRowProps {
  readonly item: ConversationItem;
  readonly active: boolean;
  readonly confirming: boolean;
  readonly deleting: boolean;
  readonly onSelect: (id: string) => void;
  readonly onRequestDelete: (id: string) => void;
  readonly onConfirmDelete: (id: string) => void;
  readonly onCancelDelete: () => void;
}

function HistoryRow({
  item, active, confirming, deleting,
  onSelect, onRequestDelete, onConfirmDelete, onCancelDelete,
}: HistoryRowProps) {
  const title = item.title?.trim() || 'Cuộc hội thoại chưa đặt tên';
  const timeText = formatConversationTime(item.updatedAt || item.createdAt);
  return (
    <li className={`chat-history-row${active ? ' chat-history-row--active' : ''}`}>
      <button
        type="button"
        className="chat-history-row__select"
        onClick={() => onSelect(item.id)}
        aria-current={active ? 'true' : undefined}
        title={title}
      >
        <span className="material-symbols-outlined chat-history-row__icon" aria-hidden="true">
          {active ? 'chat' : 'chat_bubble_outline'}
        </span>
        <span className="chat-history-row__body">
          <span className="chat-history-row__title">{title}</span>
          <span className="chat-history-row__meta">
            {active && <span className="chat-history-row__badge">Đang mở</span>}
            <span>{timeText}</span>
          </span>
        </span>
      </button>
      {confirming ? (
        <div className="chat-history-row__confirm" role="group" aria-label="Xác nhận xóa cuộc hội thoại">
          <button
            type="button"
            className="chat-history-row__confirm-yes"
            onClick={() => onConfirmDelete(item.id)}
            disabled={deleting}
          >
            {deleting ? 'Đang xóa…' : 'Xóa'}
          </button>
          <button
            type="button"
            className="chat-history-row__confirm-no"
            onClick={onCancelDelete}
            disabled={deleting}
          >
            Hủy
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="chat-history-row__delete"
          onClick={() => onRequestDelete(item.id)}
          aria-label={`Xóa cuộc trò chuyện ${title}`}
          title="Xóa cuộc trò chuyện"
        >
          <span className="material-symbols-outlined" aria-hidden="true">delete_outline</span>
        </button>
      )}
    </li>
  );
}

interface HistoryBodyProps {
  readonly loading: boolean;
  readonly error: string | null;
  readonly groups: readonly ConversationGroup[];
  readonly hasSearch: boolean;
  readonly hasMore: boolean;
  readonly loadingMore: boolean;
  readonly activeConversationId?: string | undefined;
  readonly confirmId: string | null;
  readonly deletingId: string | null;
  readonly onRetry: () => void;
  readonly onClearSearch: () => void;
  readonly onNewChat: () => void;
  readonly onSelect: (id: string) => void;
  readonly onLoadMore: () => void;
  readonly onRequestDelete: (id: string) => void;
  readonly onConfirmDelete: (id: string) => void;
  readonly onCancelDelete: () => void;
}

function HistoryListBody({
  loading, error, groups, hasSearch, hasMore, loadingMore,
  activeConversationId, confirmId, deletingId,
  onRetry, onClearSearch, onNewChat, onSelect, onLoadMore,
  onRequestDelete, onConfirmDelete, onCancelDelete,
}: HistoryBodyProps) {
  if (loading) {
    return (
      <div className="chat-history-modal__skeletons" aria-busy="true" aria-label="Đang tải lịch sử">
        <div className="chat-history-skeleton" />
        <div className="chat-history-skeleton" />
        <div className="chat-history-skeleton" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="chat-history-modal__state" role="alert">
        <span className="material-symbols-outlined chat-history-modal__state-icon" aria-hidden="true">error_outline</span>
        <p>{error}</p>
        <button type="button" className="chat-history-modal__state-btn" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <div className="chat-history-modal__state">
        <span className="material-symbols-outlined chat-history-modal__state-icon" aria-hidden="true">
          {hasSearch ? 'search_off' : 'forum'}
        </span>
        <p>{hasSearch ? 'Không tìm thấy cuộc trò chuyện phù hợp.' : 'Chưa có cuộc trò chuyện nào trong Workspace này.'}</p>
        <button type="button" className="chat-history-modal__state-btn" onClick={hasSearch ? onClearSearch : onNewChat}>
          {hasSearch ? 'Xóa từ khóa' : 'Bắt đầu hội thoại mới'}
        </button>
      </div>
    );
  }
  return (
    <div className="chat-history-modal__list">
      {groups.map((group) => (
        <section key={group.label} className="chat-history-group" aria-label={group.label}>
          <h4 className="chat-history-group__label">{group.label}</h4>
          <ul className="chat-history-group__items">
            {group.items.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                active={item.id === activeConversationId}
                confirming={confirmId === item.id}
                deleting={deletingId === item.id}
                onSelect={onSelect}
                onRequestDelete={onRequestDelete}
                onConfirmDelete={onConfirmDelete}
                onCancelDelete={onCancelDelete}
              />
            ))}
          </ul>
        </section>
      ))}
      {hasMore && (
        <button type="button" className="chat-history-modal__more" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? 'Đang tải thêm…' : 'Xem thêm cuộc trò chuyện'}
        </button>
      )}
    </div>
  );
}

interface HistoryModalHeaderProps {
  readonly workspaceName?: string | undefined;
  readonly totalElements: number | null;
  readonly onNew: () => void;
  readonly onClose: () => void;
}

function HistoryModalHeader({ workspaceName, totalElements, onNew, onClose }: HistoryModalHeaderProps) {
  return (
    <div className="chat-history-modal__header">
      <div className="chat-history-modal__heading">
        <div className="chat-history-modal__title-row">
          <h3 className="chat-history-modal__title">Lịch sử trò chuyện</h3>
          {totalElements !== null && <span className="chat-history-modal__count">{totalElements}</span>}
        </div>
        {workspaceName && <p className="chat-history-modal__sub">{workspaceName}</p>}
      </div>
      <div className="chat-history-modal__header-actions">
        <button type="button" className="chat-history-modal__new-btn" onClick={onNew} title="Tạo cuộc trò chuyện mới">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
          <span>Mới</span>
        </button>
        <button
          type="button"
          className="chat-history-modal__close-btn"
          onClick={onClose}
          aria-label="Đóng lịch sử cuộc trò chuyện"
          title="Đóng"
        >
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
    </div>
  );
}

/** Floating top-left history bubble under the Back button that opens a compact workspace conversation modal. */
export function ChatHistoryPopover({
  workspaceId, workspaceName, activeConversationId,
  onSelectConversation, onNewChat, onDeletedActive,
}: ChatHistoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestSeq = useRef(0);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (!workspaceId) return;
    const seq = ++requestSeq.current;
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }
    try {
      const response = await fetchWorkspaceConversations(workspaceId, targetPage, PAGE_SIZE);
      if (seq !== requestSeq.current) return;
      const incoming = response.content ?? [];
      setItems((prev) => (append ? [...prev, ...incoming] : incoming));
      setPage(response.number ?? targetPage);
      setTotalPages(response.totalPages ?? 1);
      setTotalElements(typeof response.totalElements === 'number' ? response.totalElements : incoming.length);
      setError(null);
    } catch (failure: unknown) {
      if (seq !== requestSeq.current) return;
      setError(failure instanceof Error ? failure.message : 'Không thể tải danh sách cuộc trò chuyện.');
    } finally {
      if (seq === requestSeq.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [workspaceId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!open) return;
    setConfirmId(null);
    void loadPage(0, false);
  }, [open, loadPage]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const groups = useMemo(
    () => groupConversationsByDate(filterConversations(items, debouncedSearch)),
    [items, debouncedSearch],
  );

  const handleSelect = (id: string) => {
    setOpen(false);
    onSelectConversation(id);
  };

  const handleNew = () => {
    setOpen(false);
    onNewChat();
  };

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWorkspaceConversation(workspaceId, id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalElements((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
      setConfirmId(null);
      if (id === activeConversationId) {
        setOpen(false);
        onDeletedActive?.();
      }
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : 'Không thể xóa cuộc trò chuyện.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div ref={rootRef} className="chat-history-launcher">
      <button
        ref={triggerRef}
        type="button"
        className={`chat-history-bubble${open ? ' chat-history-bubble--open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="workspace-chat-history-modal"
        aria-label="Lịch sử cuộc trò chuyện trong Workspace"
        title="Lịch sử cuộc trò chuyện"
      >
        <span className="material-symbols-outlined" aria-hidden="true">history</span>
      </button>

      {open && (
        <div
          id="workspace-chat-history-modal"
          className="chat-history-modal"
          role="dialog"
          aria-label="Lịch sử cuộc trò chuyện"
        >
          <HistoryModalHeader
            workspaceName={workspaceName}
            totalElements={totalElements}
            onNew={handleNew}
            onClose={() => setOpen(false)}
          />

          <div className="chat-history-modal__search">
            <span className="material-symbols-outlined chat-history-modal__search-icon" aria-hidden="true">search</span>
            <input
              type="search"
              className="chat-history-modal__search-input"
              placeholder="Tìm cuộc trò chuyện..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-label="Tìm cuộc trò chuyện trong Workspace"
            />
            {searchInput && (
              <button
                type="button"
                className="chat-history-modal__search-clear"
                onClick={() => { setSearchInput(''); setDebouncedSearch(''); }}
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            )}
          </div>

          <HistoryListBody
            loading={loading}
            error={error}
            groups={groups}
            hasSearch={Boolean(debouncedSearch.trim())}
            hasMore={page + 1 < totalPages}
            loadingMore={loadingMore}
            activeConversationId={activeConversationId}
            confirmId={confirmId}
            deletingId={deletingId}
            onRetry={() => void loadPage(0, false)}
            onClearSearch={() => { setSearchInput(''); setDebouncedSearch(''); }}
            onNewChat={handleNew}
            onSelect={handleSelect}
            onLoadMore={() => void loadPage(page + 1, true)}
            onRequestDelete={(id) => setConfirmId(id)}
            onConfirmDelete={(id) => void handleConfirmDelete(id)}
            onCancelDelete={() => setConfirmId(null)}
          />

          <div className="chat-history-modal__footer">
            <Link
              to={`/workspaces/${workspaceId}/conversations`}
              className="chat-history-modal__all-link"
              onClick={() => setOpen(false)}
            >
              <span>Xem toàn bộ trang lịch sử</span>
              <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
