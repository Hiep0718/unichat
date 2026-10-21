/**
 * About tab of a group — what this space is for, and how its AI assistant
 * relates to the files inside it.
 *
 * Two columns: what the group is, and the numbers describing it. The facts
 * were a flat definition list under the prose, which put "Ngày tạo" and the
 * group's purpose at the same weight. Numbers belong beside the text, not
 * after it.
 */
import { Link, useParams } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { useWorkspace } from '../workspace-context';
import { useWorkspace as useWorkspaceQuery } from '../workspace-hooks';
import { visibilityOption } from '../workspace-visibility';
import { TopicChips } from './topic-chips';

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
  const { workspace, role, isOwner } = useWorkspace();
  const { data: details } = useWorkspaceQuery(workspaceId);

  if (!workspace) return null;

  const privacy = visibilityOption(workspace.visibility);

  return (
    <div className="group-about">
      <div className="group-about__main">
        <section className="group-about__card">
          <header className="group-about__card-head">
            <h2 className="group-about__heading">Mô tả</h2>
            {isOwner && (
              <Link
                to={`/workspaces/${workspaceId}/settings`}
                className="group-about__edit"
              >
                <Icon name="edit" size={15} />
                Chỉnh sửa
              </Link>
            )}
          </header>
          <p className="group-about__description">
            {workspace.description?.trim() || 'Nhóm này chưa có mô tả.'}
          </p>
          <TopicChips topics={details?.topics ?? []} />
        </section>

        <section className="group-about__card group-about__card--ai">
          <header className="group-about__card-head">
            <h2 className="group-about__heading">
              <Icon name="auto_awesome" size={17} />
              Trợ lý AI của nhóm
            </h2>
            <span className="group-about__badge">RAG</span>
          </header>
          <p className="group-about__description">
            Trợ lý trả lời dựa trên các tệp trong tab <strong>Tệp</strong> của nhóm này,
            kèm trích dẫn tới đúng tài liệu. Thành viên đóng góp thêm tệp ở tab đó;
            tệp được duyệt sẽ trở thành nguồn mà trợ lý có thể trích dẫn.
          </p>
          <ul className="group-about__points">
            <li>
              <Icon name="format_quote" size={16} />
              Mỗi câu trả lời dẫn ngược về đoạn tài liệu đã dùng
            </li>
            <li>
              <Icon name="shield" size={16} />
              Thiếu căn cứ trong tài liệu thì trợ lý từ chối thay vì đoán
            </li>
          </ul>
          <Link to={`/workspaces/${workspaceId}/chat`} className="group-about__cta">
            <Icon name="auto_awesome" size={18} />
            Bắt đầu hỏi Trợ lý AI
          </Link>
        </section>

        <div className="group-about__pair">
          <section className="group-about__card group-about__card--quiet">
            <h3 className="group-about__subheading">
              <Icon name={privacy.icon} size={16} />
              {privacy.label}
            </h3>
            <p className="group-about__note">{privacy.description}</p>
          </section>

          <section className="group-about__card group-about__card--quiet">
            <h3 className="group-about__subheading">
              <Icon name="fact_check" size={16} />
              Kiểm duyệt tài liệu
            </h3>
            <p className="group-about__note">
              Tệp do thành viên tải lên cần chủ sở hữu duyệt trước khi trở thành
              nguồn cho trợ lý.
            </p>
          </section>
        </div>
      </div>

      <aside className="group-about__aside">
        <section className="group-about__card">
          <h2 className="group-about__heading">Thông tin chi tiết</h2>
          <dl className="group-about__facts">
            <div className="group-about__fact">
              <dt>Vai trò của bạn</dt>
              <dd>
                <span className="group-about__role">{ROLE_LABEL[role] ?? role}</span>
              </dd>
            </div>
            <div className="group-about__fact">
              <dt>Thành viên</dt>
              <dd>
                {details?.memberCount ?? '—'}
                <Link to={`/workspaces/${workspaceId}/members`} className="group-about__jump">
                  Xem
                </Link>
              </dd>
            </div>
            <div className="group-about__fact">
              <dt>Tệp tài liệu</dt>
              <dd>
                {details?.documentCount ?? '—'}
                <Link to={`/workspaces/${workspaceId}/documents`} className="group-about__jump">
                  Mở
                </Link>
              </dd>
            </div>
            <div className="group-about__fact">
              <dt>Ngày tạo</dt>
              <dd>{formatDate(details?.createdAt)}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}

export default GroupAboutTab;
