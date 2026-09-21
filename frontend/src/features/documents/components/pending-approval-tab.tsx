/**
 * Approval queue for documents contributed by workspace members.
 *
 * A contribution stays out of retrieval until an owner or editor approves it,
 * so this screen is the gate between "a member uploaded a file" and "the AI can
 * cite it".
 */
import { useState } from 'react';

import { Icon } from '../../../components/icon';
import { formatRelativeTime } from '../../../lib/format-time';
import {
  useApproveDocument,
  usePendingApprovals,
  useRejectDocument,
} from '../document-hooks';
import type { DocumentResponse } from '../document-api';
import './pending-approval-tab.css';

interface PendingApprovalTabProps {
  readonly workspaceId: string;
  /** Only owners and editors may decide; others see an explanatory message. */
  readonly canModerate: boolean;
  /**
   * Render nothing at all when the queue is empty or the user cannot moderate.
   * Used when the panel sits above other content rather than filling a tab.
   */
  readonly hideWhenEmpty?: boolean;
  /** Called after an approve or reject succeeds, so siblings can refresh. */
  readonly onDecision?: () => void;
}

/** Renders a human-readable file size. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PendingApprovalTab({
  workspaceId,
  canModerate,
  hideWhenEmpty = false,
  onDecision,
}: PendingApprovalTabProps) {
  const { data, isLoading, error } = usePendingApprovals(workspaceId, canModerate);
  const approveMutation = useApproveDocument(workspaceId);
  const rejectMutation = useRejectDocument(workspaceId);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const queueLength = data?.content.length ?? 0;

  if (hideWhenEmpty && (!canModerate || isLoading || error || queueLength === 0)) {
    return null;
  }

  if (!canModerate) {
    return (
      <div className="pending-approval__empty">
        <Icon name="lock" size={48} />
        <h3>Chỉ chủ sở hữu và người biên tập mới duyệt được tài liệu</h3>
        <p>Bạn vẫn có thể đóng góp tài liệu ở tab Tài liệu.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="pending-approval__loading">Đang tải danh sách chờ duyệt...</div>;
  }

  if (error) {
    return (
      <div className="pending-approval__empty">
        <Icon name="error_outline" size={48} />
        <h3>Không tải được danh sách chờ duyệt</h3>
      </div>
    );
  }

  const items = data?.content ?? [];

  if (items.length === 0) {
    return (
      <div className="pending-approval__empty">
        <Icon name="task_alt" size={48} />
        <h3>Không có tài liệu nào chờ duyệt</h3>
        <p>Tài liệu do thành viên đóng góp sẽ xuất hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="pending-approval">
      <h2 className="pending-approval__heading">
        <Icon name="inventory" size={20} />
        Tài liệu chờ duyệt ({items.length})
      </h2>

      <div className="pending-approval__notice">
        <Icon name="info" size={18} />
        <span>
          Tài liệu chờ duyệt <strong>chưa được AI sử dụng</strong>. Chỉ sau khi duyệt,
          nội dung mới được đưa vào kho tri thức và có thể được trích dẫn.
        </span>
      </div>

      <ul className="pending-approval__list">
        {items.map((doc) => (
          <PendingItem
            key={doc.id}
            document={doc}
            isRejecting={rejectingId === doc.id}
            isBusy={approveMutation.isPending || rejectMutation.isPending}
            onStartReject={() => setRejectingId(doc.id)}
            onCancelReject={() => setRejectingId(null)}
            onApprove={() =>
              approveMutation.mutate(doc.id, { onSuccess: () => onDecision?.() })
            }
            onReject={(reason) => {
              rejectMutation.mutate(
                { documentId: doc.id, reason },
                { onSuccess: () => onDecision?.() }
              );
              setRejectingId(null);
            }}
          />
        ))}
      </ul>
    </div>
  );
}

interface PendingItemProps {
  readonly document: DocumentResponse;
  readonly isRejecting: boolean;
  readonly isBusy: boolean;
  readonly onStartReject: () => void;
  readonly onCancelReject: () => void;
  readonly onApprove: () => void;
  readonly onReject: (reason: string) => void;
}

function PendingItem({
  document,
  isRejecting,
  isBusy,
  onStartReject,
  onCancelReject,
  onApprove,
  onReject,
}: PendingItemProps) {
  const [reason, setReason] = useState('');

  return (
    <li className="pending-approval__item">
      <div className="pending-approval__file">
        <Icon name="description" size={22} />
        <div className="pending-approval__meta">
          <span className="pending-approval__name">{document.originalName}</span>
          <span className="pending-approval__sub">
            {formatBytes(document.byteSize)} · gửi bởi{' '}
            <strong>{document.uploadedByEmail ?? 'Không rõ'}</strong> ·{' '}
            {formatRelativeTime(document.createdAt)}
          </span>
        </div>
      </div>

      {(document.contributionSummary || document.contributionReason) && (
        <dl className="pending-approval__context">
          {document.contributionSummary && (
            <div className="pending-approval__context-row">
              <dt>Nội dung tài liệu</dt>
              <dd>{document.contributionSummary}</dd>
            </div>
          )}
          {document.contributionReason && (
            <div className="pending-approval__context-row">
              <dt>Lý do cần thêm</dt>
              <dd>{document.contributionReason}</dd>
            </div>
          )}
        </dl>
      )}

      {isRejecting ? (
        <div className="pending-approval__reject-form">
          <input
            className="pending-approval__reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Lý do từ chối (thành viên sẽ thấy)..."
            maxLength={500}
            autoFocus
          />
          <button
            type="button"
            className="pending-approval__btn pending-approval__btn--danger"
            disabled={!reason.trim() || isBusy}
            onClick={() => onReject(reason.trim())}
          >
            Xác nhận từ chối
          </button>
          <button
            type="button"
            className="pending-approval__btn"
            onClick={onCancelReject}
          >
            Hủy
          </button>
        </div>
      ) : (
        <div className="pending-approval__actions">
          <button
            type="button"
            className="pending-approval__btn pending-approval__btn--primary"
            disabled={isBusy}
            onClick={onApprove}
          >
            <Icon name="check" size={16} />
            Duyệt vào kho tri thức
          </button>
          <button
            type="button"
            className="pending-approval__btn"
            disabled={isBusy}
            onClick={onStartReject}
          >
            Từ chối
          </button>
        </div>
      )}
    </li>
  );
}
