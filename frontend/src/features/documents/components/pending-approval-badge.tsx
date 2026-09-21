/**
 * Count of documents waiting for approval, shown on the Documents nav item.
 *
 * Contributions are easy to miss otherwise: nothing tells the owner a member
 * uploaded something unless they happen to open the Documents page.
 *
 * Renders only inside a workspace and only for roles that can approve.
 */
import { usePendingApprovalCount } from '../document-hooks';
import { useWorkspace } from '../../workspaces/workspace-context';
import './pending-approval-badge.css';

/** Counts above this are shown as "9+" so the pill keeps its size. */
const MAX_DISPLAYED = 9;

export function PendingApprovalBadge() {
  const { workspace, canEdit } = useWorkspace();
  const { data } = usePendingApprovalCount(workspace?.id ?? '', canEdit);

  const count = data?.pendingCount ?? 0;
  if (!canEdit || count === 0) {
    return null;
  }

  return (
    <span
      className="pending-badge"
      title={`${count} tài liệu đang chờ bạn duyệt`}
      aria-label={`${count} tài liệu đang chờ duyệt`}
    >
      {count > MAX_DISPLAYED ? `${MAX_DISPLAYED}+` : count}
    </span>
  );
}
