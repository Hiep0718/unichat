/**
 * The column beside a group's posts: what the group can answer, and who is in it.
 *
 * Both cards are shortcuts to places the page already reaches — the assistant
 * and the members tab. They earn the width because the post list answers
 * neither question: a reader scrolling titles cannot see that this group has
 * files its assistant will read, nor who they would be asking.
 */
import { Link, useNavigate } from 'react-router-dom';

import { Icon } from '../../../components/icon';
import { MemberFaces } from './member-faces';

import type { WorkspaceFace } from '../workspace-schema';
import './group-rail.css';

interface GroupRailProps {
  readonly workspaceId: string;
  /** A few members to draw as faces, owners first; empty until loaded. */
  readonly faces: readonly WorkspaceFace[];
  readonly memberCount: number;
}

export function GroupRail({ workspaceId, faces, memberCount }: GroupRailProps) {
  return (
    <aside className="group-rail" aria-label="Thông tin nhóm">
      <AssistantCard workspaceId={workspaceId} />
      <MembersCard workspaceId={workspaceId} faces={faces} memberCount={memberCount} />
    </aside>
  );
}

/**
 * The invitation to ask the group's own assistant.
 *
 * It promises citations and nothing about how many files are ready, because
 * the group endpoint reports only a total and a file still being ingested is
 * not one the assistant can read. A number that may be wrong is worse here
 * than no number: this card's whole claim is that the answers are grounded.
 */
function AssistantCard({ workspaceId }: { readonly workspaceId: string }) {
  const navigate = useNavigate();

  return (
    <section className="group-rail__ai">
      <h2 className="group-rail__ai-title">Hỏi trợ lý của nhóm</h2>
      <p className="group-rail__ai-text">
        Trả lời dựa trên tài liệu của nhóm, kèm trích dẫn nguồn.
      </p>
      <button
        type="button"
        className="group-rail__ai-btn"
        onClick={() => navigate(`/workspaces/${workspaceId}/chat`)}
      >
        Bắt đầu hỏi
        <Icon name="arrow_forward" size={16} />
      </button>
    </section>
  );
}

interface MembersCardProps {
  readonly workspaceId: string;
  readonly faces: readonly WorkspaceFace[];
  readonly memberCount: number;
}

/** Who is in the group, and the way to the full list. */
function MembersCard({ workspaceId, faces, memberCount }: MembersCardProps) {
  return (
    <section className="group-rail__card">
      <h2 className="group-rail__card-title">Thành viên</h2>
      <div className="group-rail__members">
        <MemberFaces faces={faces} memberCount={memberCount} size={30} />
        <Link to={`/workspaces/${workspaceId}/members`} className="group-rail__link">
          Xem tất cả
        </Link>
      </div>
    </section>
  );
}
