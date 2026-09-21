/**
 * About tab of a group — what this space is for, and how its AI assistant
 * relates to the files inside it.
 */
import { useParams } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { useWorkspace } from '../workspace-context';
import { useWorkspace as useWorkspaceQuery } from '../workspace-hooks';
import './group-about-tab.css';

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Chủ sở hữu',
  EDITOR: 'Người biên tập',
  VIEWER: 'Thành viên',
};

/** Formats an ISO date as a Vietnamese short date. */
function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function GroupAboutTab() {
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const { workspace, role } = useWorkspace();
  const { data: details } = useWorkspaceQuery(workspaceId);

  if (!workspace) return null;

  return (
    <div className="group-about">
      <section className="group-about__card">
        <h2 className="group-about__heading">Mô tả</h2>
        <p className="group-about__description">
          {workspace.description?.trim() || 'Nhóm này chưa có mô tả.'}
        </p>
      </section>

      <section className="group-about__card group-about__card--ai">
        <h2 className="group-about__heading">
          <Icon name="auto_awesome" size={17} />
          Trợ lý AI của nhóm
        </h2>
        <p className="group-about__description">
          Trợ lý trả lời dựa trên các tệp trong tab <strong>Tệp</strong> của nhóm này,
          kèm trích dẫn tới đúng tài liệu. Thành viên đóng góp thêm tệp ở tab đó;
          tệp được duyệt sẽ trở thành nguồn mà trợ lý có thể trích dẫn.
        </p>
      </section>

      <section className="group-about__card">
        <h2 className="group-about__heading">Thông tin</h2>
        <dl className="group-about__facts">
          <div>
            <dt>Vai trò của bạn</dt>
            <dd>{ROLE_LABEL[role] ?? role}</dd>
          </div>
          <div>
            <dt>Thành viên</dt>
            <dd>{details?.memberCount ?? '—'}</dd>
          </div>
          <div>
            <dt>Tệp tài liệu</dt>
            <dd>{details?.documentCount ?? '—'}</dd>
          </div>
          <div>
            <dt>Ngày tạo</dt>
            <dd>{formatDate(details?.createdAt)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

export default GroupAboutTab;
